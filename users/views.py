from django.utils import timezone 
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from .email_service import email_service
from rest_framework.response import Response
from django.contrib.auth import login, logout
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
import uuid
from datetime import datetime, timedelta
from .models import User, Team, TeamMember, TeamInvitation, Project, ProjectMember, Task, Subtask, TaskComment, TaskAttachment
from .serializers import *

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    if request.method == 'POST':
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Create token for the user
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    if request.method == 'POST':
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            # Create or get token
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Login successful'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    # For token auth, we can just delete the token on client side
    # But if you want server-side logout, you can delete the token
    if hasattr(request.user, 'auth_token'):
        request.user.auth_token.delete()
    return Response({'message': 'Logout successful'})

@api_view(['GET'])
def profile_view(request):
    user = request.user
    serializer = UserSerializer(user)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
def teams_view(request):
    if request.method == 'GET':
        teams = Team.objects.filter(members__user=request.user, members__is_active=True)
        serializer = TeamSerializer(teams, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        print("Received data:", request.data)  # Debug print
        serializer = TeamSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            print("Serializer is valid")  # Debug print
            team = serializer.save()  # Remove created_by parameter here
            # Add creator as owner
            TeamMember.objects.create(
                user=request.user,
                team=team,
                role=TeamMember.Role.OWNER
            )
            # Return the created team with full details
            response_serializer = TeamSerializer(team, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("Serializer errors:", serializer.errors)  # Debug print
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def pending_invitations_view(request):
    """Get pending invitations for the current user"""
    invitations = TeamInvitation.objects.filter(
        email=request.user.email,
        status=TeamInvitation.Status.PENDING,
        expires_at__gt=datetime.now()
    )
    serializer = TeamInvitationSerializer(invitations, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_pending_invitations_view(request):
    """Check for pending invitations for an email"""
    email = request.GET.get('email')
    if not email:
        return Response({'error': 'Email parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    pending_invitations = TeamInvitation.objects.filter(
        email=email,
        status=TeamInvitation.Status.PENDING,
        expires_at__gt=timezone.now()
    )
    
    serializer = TeamInvitationSerializer(pending_invitations, many=True)
    return Response({
        'pending_invitations': serializer.data,
        'count': pending_invitations.count()
    })

# In views.py - Remove or restrict the auto-accept endpoint
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def accept_pending_invitations_view(request):
    """DEPRECATED: This should not be used for auto-acceptance on registration"""
    return Response({
        'error': 'This endpoint is deprecated. Please accept invitations individually through the notification system.'
    }, status=status.HTTP_410_GONE)


@api_view(['POST'])
def accept_invitation_view(request, token):
    """Accept an team invitation (authenticated users)"""
    invitation = get_object_or_404(
        TeamInvitation, 
        token=token,
        status=TeamInvitation.Status.PENDING
    )
    
    if invitation.email != request.user.email:
        return Response({'error': 'This invitation is not for your account'}, status=status.HTTP_403_FORBIDDEN)
    
    if invitation.expires_at < timezone.now():
        invitation.status = TeamInvitation.Status.EXPIRED
        invitation.save()
        update_invitation_notifications(invitation)
        return Response({'error': 'This invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create team membership
    TeamMember.objects.create(
        user=request.user,
        team=invitation.team,
        role=invitation.role
    )
    
    # Update invitation status
    invitation.status = TeamInvitation.Status.ACCEPTED
    invitation.save()
    
    # Use the same notification creation logic as the public endpoint
    # CREATE notification for the user
    user_notification, created = Notification.objects.get_or_create(
        user=request.user,
        related_id=invitation.id,
        type=Notification.Type.INVITATION,
        defaults={
            'title': "🎉 Invitation Accepted",
            'message': f"You've successfully joined {invitation.team.name}",
            'status': Notification.Status.READ
        }
    )
    
    if not created:
        user_notification.title = "🎉 Invitation Accepted"
        user_notification.message = f"You've successfully joined {invitation.team.name}"
        user_notification.status = Notification.Status.READ
        user_notification.save()
    
    # CREATE notification for the inviter
    inviter_notification, created = Notification.objects.get_or_create(
        user=invitation.invited_by,
        related_id=invitation.id,
        type=Notification.Type.INVITATION,
        defaults={
            'title': "✅ Invitation Accepted",
            'message': f"{request.user.first_name} {request.user.last_name} accepted your invitation to join {invitation.team.name}",
            'status': Notification.Status.READ,
            'action_url': f"/team/{invitation.team.id}"
        }
    )
    
    if not created:
        inviter_notification.title = "✅ Invitation Accepted"
        inviter_notification.message = f"{request.user.first_name} {request.user.last_name} accepted your invitation to join {invitation.team.name}"
        inviter_notification.status = Notification.Status.READ
        inviter_notification.save()
    
    return Response({'message': 'Successfully joined the team'})

@api_view(['POST'])
def reject_invitation_view(request, token):
    """Reject an team invitation"""
    invitation = get_object_or_404(
        TeamInvitation, 
        token=token,
        status=TeamInvitation.Status.PENDING
    )
    
    if invitation.email != request.user.email:
        return Response({'error': 'This invitation is not for your account'}, status=status.HTTP_403_FORBIDDEN)
    
    # Update invitation status
    invitation.status = TeamInvitation.Status.REJECTED
    invitation.save()
    
    # Update notifications - THIS IS CRUCIAL
    update_invitation_notifications(invitation, request.user)
    
    return Response({'message': 'Invitation rejected'})


@api_view(['POST'])
def invite_member_view(request, team_id):
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission to invite (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions to invite members'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = InvitationCreateSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        role = serializer.validated_data['role']
        
        # Check if user already exists and is already a member
        existing_user = User.objects.filter(email=email).first()
        if existing_user and TeamMember.objects.filter(team=team, user=existing_user).exists():
            return Response({'error': 'User is already a member of this team'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for existing pending invitation
        existing_invitation = TeamInvitation.objects.filter(
            email=email,
            team=team,
            status=TeamInvitation.Status.PENDING,
            expires_at__gt=timezone.now()
        ).first()
        
        if existing_invitation:
            return Response({'error': 'An active invitation already exists for this email'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create invitation
        invitation = TeamInvitation.objects.create(
            email=email,
            team=team,
            invited_by=request.user,
            token=str(uuid.uuid4()),
            role=role,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Send email invitation
        inviter_name = f"{request.user.first_name} {request.user.last_name}"
        email_sent = email_service.send_invitation_email(invitation, inviter_name, team.name)
        
        # Create notification for the invited user if they exist in the system
        if existing_user:
            Notification.objects.create(
                user=existing_user,
                type=Notification.Type.INVITATION,
                title="Team Invitation",
                message=f"{inviter_name} invited you to join {team.name}",
                related_id=invitation.id,
                action_url=f"/invitation/accept/{invitation.token}"
            )
        
        return Response({
            'message': f'Invitation sent to {email}',
            'invitation_id': invitation.id,
            'email_sent': email_sent,
            'user_exists': existing_user is not None
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def invitation_details_view(request, token):
    """Get invitation details (public endpoint for email links)"""
    invitation = get_object_or_404(
        TeamInvitation, 
        token=token
    )
    
    # Check if invitation is valid
    if invitation.status != TeamInvitation.Status.PENDING:
        return Response({'error': 'This invitation has already been processed'}, status=status.HTTP_400_BAD_REQUEST)
    
    if invitation.expires_at < timezone.now():
        invitation.status = TeamInvitation.Status.EXPIRED
        invitation.save()
        return Response({'error': 'This invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = TeamInvitationSerializer(invitation)
    return Response(serializer.data)

# In views.py - Fix the accept_invitation_public_view function
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def accept_invitation_public_view(request, token):
    """Accept invitation (public endpoint for email links)"""
    invitation = get_object_or_404(
        TeamInvitation, 
        token=token
    )
    
    # Check if invitation is already processed
    if invitation.status != TeamInvitation.Status.PENDING:
        return Response({
            'success': True,
            'message': f'This invitation has already been {invitation.get_status_display().lower()}',
            'current_status': invitation.status,
            'team_name': invitation.team.name
        })
    
    if invitation.expires_at < timezone.now():
        invitation.status = TeamInvitation.Status.EXPIRED
        invitation.save()
        update_invitation_notifications(invitation)
        return Response({
            'success': False,
            'message': 'This invitation has expired',
            'action_required': 'expired'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user exists with this email
    try:
        user = User.objects.get(email=invitation.email)
        
        # Check if user is already a member of this team
        if TeamMember.objects.filter(team=invitation.team, user=user).exists():
            # User is already a member - mark invitation as accepted and return success
            invitation.status = TeamInvitation.Status.ACCEPTED
            invitation.save()
            
            # Update notifications for both users
            update_invitation_notifications(invitation, user)
            
            return Response({
                'success': True,
                'message': 'You are already a member of this team!',
                'team_id': str(invitation.team.id),
                'team_name': invitation.team.name,
                'already_member': True
            })
        
        # Create team membership
        TeamMember.objects.create(
            user=user,
            team=invitation.team,
            role=invitation.role
        )
        
        # Update invitation status
        invitation.status = TeamInvitation.Status.ACCEPTED
        invitation.save()
        
        # CREATE notification for the user if it doesn't exist
        user_notification, created = Notification.objects.get_or_create(
            user=user,
            related_id=invitation.id,
            type=Notification.Type.INVITATION,
            defaults={
                'title': "🎉 Invitation Accepted",
                'message': f"You've successfully joined {invitation.team.name}",
                'status': Notification.Status.READ
            }
        )
        
        if not created:
            # Update existing notification
            user_notification.title = "🎉 Invitation Accepted"
            user_notification.message = f"You've successfully joined {invitation.team.name}"
            user_notification.status = Notification.Status.READ
            user_notification.save()
        
        # CREATE notification for the inviter
        inviter_notification, created = Notification.objects.get_or_create(
            user=invitation.invited_by,
            related_id=invitation.id,
            type=Notification.Type.INVITATION,
            defaults={
                'title': "✅ Invitation Accepted",
                'message': f"{user.first_name} {user.last_name} accepted your invitation to join {invitation.team.name}",
                'status': Notification.Status.READ,
                'action_url': f"/team/{invitation.team.id}"
            }
        )
        
        if not created:
            # Update existing notification
            inviter_notification.title = "✅ Invitation Accepted"
            inviter_notification.message = f"{user.first_name} {user.last_name} accepted your invitation to join {invitation.team.name}"
            inviter_notification.status = Notification.Status.READ
            inviter_notification.save()
        
        return Response({
            'success': True,
            'message': 'Successfully joined the team!',
            'team_id': str(invitation.team.id),
            'team_name': invitation.team.name,
            'user_name': f"{user.first_name} {user.last_name}"
        })
        
    except User.DoesNotExist:
        # User doesn't exist - return special response to redirect to registration
        return Response({
            'action_required': 'register',
            'message': 'Please create an account to accept this invitation',
            'invitation_email': invitation.email,
            'team_name': invitation.team.name,
            'invited_by_name': f"{invitation.invited_by.first_name} {invitation.invited_by.last_name}",
            'token': token  # Include token for later use
        }, status=status.HTTP_200_OK)
    
def update_invitation_notifications(invitation, acting_user=None):
    """Update all notifications related to an invitation - SIMPLIFIED VERSION"""
    
    # For the invited user
    try:
        invited_user = User.objects.get(email=invitation.email)
        # Get or create notification for invited user
        user_notification, created = Notification.objects.get_or_create(
            user=invited_user,
            related_id=invitation.id,
            type=Notification.Type.INVITATION,
            defaults={
                'title': "🎉 Invitation Accepted" if invitation.status == TeamInvitation.Status.ACCEPTED else "❌ Invitation Declined",
                'message': f"You've successfully joined {invitation.team.name}" if invitation.status == TeamInvitation.Status.ACCEPTED else f"You've declined the invitation to join {invitation.team.name}",
                'status': Notification.Status.READ
            }
        )
        
        if not created:
            # Update existing notification
            if invitation.status == TeamInvitation.Status.ACCEPTED:
                user_notification.title = "🎉 Invitation Accepted"
                user_notification.message = f"You've successfully joined {invitation.team.name}"
            elif invitation.status == TeamInvitation.Status.REJECTED:
                user_notification.title = "❌ Invitation Declined"
                user_notification.message = f"You've declined the invitation to join {invitation.team.name}"
            elif invitation.status == TeamInvitation.Status.EXPIRED:
                user_notification.title = "⏰ Invitation Expired"
                user_notification.message = f"The invitation to join {invitation.team.name} has expired"
            
            user_notification.status = Notification.Status.READ
            user_notification.save()
            
    except User.DoesNotExist:
        pass  # User doesn't exist yet
    
    # For the inviter
    if acting_user or invitation.status in [TeamInvitation.Status.ACCEPTED, TeamInvitation.Status.REJECTED]:
        inviter_notification, created = Notification.objects.get_or_create(
            user=invitation.invited_by,
            related_id=invitation.id,
            type=Notification.Type.INVITATION,
            defaults={
                'title': "✅ Invitation Accepted" if invitation.status == TeamInvitation.Status.ACCEPTED else "❌ Invitation Declined",
                'message': f"{acting_user.first_name} {acting_user.last_name} accepted your invitation to join {invitation.team.name}" if invitation.status == TeamInvitation.Status.ACCEPTED and acting_user else f"{invitation.email} declined your invitation to join {invitation.team.name}",
                'status': Notification.Status.READ
            }
        )
        
        if not created:
            if invitation.status == TeamInvitation.Status.ACCEPTED:
                inviter_notification.title = "✅ Invitation Accepted"
                inviter_notification.message = f"{acting_user.first_name} {acting_user.last_name} accepted your invitation to join {invitation.team.name}" if acting_user else f"{invitation.email} accepted your invitation to join {invitation.team.name}"
            elif invitation.status == TeamInvitation.Status.REJECTED:
                inviter_notification.title = "❌ Invitation Declined"
                inviter_notification.message = f"{acting_user.first_name} {acting_user.last_name} declined your invitation to join {invitation.team.name}" if acting_user else f"{invitation.email} declined your invitation to join {invitation.team.name}"
            elif invitation.status == TeamInvitation.Status.EXPIRED:
                inviter_notification.title = "⏰ Invitation Expired"
                inviter_notification.message = f"Your invitation to {invitation.email} for {invitation.team.name} has expired"
            
            inviter_notification.status = Notification.Status.READ
            inviter_notification.save()
            
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reject_invitation_public_view(request, token):
    """Reject invitation (public endpoint for email links)"""
    invitation = get_object_or_404(
        TeamInvitation, 
        token=token,
        status=TeamInvitation.Status.PENDING
    )
    
    if invitation.expires_at < timezone.now():
        invitation.status = TeamInvitation.Status.EXPIRED
        invitation.save()
        update_invitation_notifications(invitation)
        return Response({'error': 'This invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update invitation status
    invitation.status = TeamInvitation.Status.REJECTED
    invitation.save()
    
    # Try to find the user to update their notifications
    try:
        user = User.objects.get(email=invitation.email)
        update_invitation_notifications(invitation, user)
    except User.DoesNotExist:
        # If user doesn't exist yet, still update inviter's notifications
        update_invitation_notifications(invitation)
    
    return Response({'message': 'Invitation declined'})

@api_view(['GET'])
def team_members_view(request, team_id):
    """Get all members of an team"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    # Use select_related to optimize database queries
    members = TeamMember.objects.filter(
        team=team, 
        is_active=True
    ).select_related('user')
    
    serializer = TeamMemberSerializer(members, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
def remove_member_view(request, team_id, member_id):
    """Remove a member from team (Owner/Admin only)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission (Owner or Admin)
    requester_member = TeamMember.objects.get(team=team, user=request.user)
    if requester_member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the member to remove
    member_to_remove = get_object_or_404(TeamMember, id=member_id, team=team)
    
    # Prevent owners from removing themselves (they should transfer ownership first)
    if member_to_remove.user == request.user and member_to_remove.role == TeamMember.Role.OWNER:
        return Response({'error': 'Owners cannot remove themselves. Transfer ownership first.'}, status=status.HTTP_400_BAD_REQUEST)
    
    member_to_remove.delete()
    return Response({'message': 'Member removed successfully'})

@api_view(['GET', 'PUT', 'DELETE'])
def team_detail_view(request, team_id):
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = TeamSerializer(team)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Check if user has permission to edit (Owner or Admin)
        member = TeamMember.objects.get(team=team, user=request.user)
        if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TeamSerializer(team, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only owner can delete team
        member = TeamMember.objects.get(team=team, user=request.user)
        if member.role != TeamMember.Role.OWNER:
            return Response({'error': 'Only owner can delete team'}, status=status.HTTP_403_FORBIDDEN)
        
        team.delete()
        return Response({'message': 'Team deleted successfully'})

@api_view(['PUT'])
def update_member_role_view(request, team_id, member_id):
    """Update a member's role (Owner/Admin only)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission (Owner or Admin)
    requester_member = TeamMember.objects.get(team=team, user=request.user)
    if requester_member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the member to update
    member_to_update = get_object_or_404(TeamMember, id=member_id, team=team)
    
    # Prevent owners from changing their own role
    if member_to_update.user == request.user and member_to_update.role == TeamMember.Role.OWNER:
        return Response({'error': 'Owners cannot change their own role'}, status=status.HTTP_400_BAD_REQUEST)
    
    # FIXED: Convert role to integer and validate
    new_role = request.data.get('role')
    
    # Convert to integer if it's a string
    if isinstance(new_role, str):
        try:
            new_role = int(new_role)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid role format'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate the role
    valid_roles = [TeamMember.Role.OWNER, TeamMember.Role.ADMIN, TeamMember.Role.MEMBER, TeamMember.Role.GUEST]
    if new_role not in valid_roles:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Additional permission checks
    # Admins cannot assign Owner role
    if requester_member.role == TeamMember.Role.ADMIN and new_role == TeamMember.Role.OWNER:
        return Response({'error': 'Admins cannot assign Owner role'}, status=status.HTTP_403_FORBIDDEN)
    
    # Admins cannot change other admins' roles
    if (requester_member.role == TeamMember.Role.ADMIN and 
        member_to_update.role == TeamMember.Role.ADMIN):
        return Response({'error': 'Admins cannot change other admins roles'}, status=status.HTTP_403_FORBIDDEN)
    
    # Update the role
    member_to_update.role = new_role
    member_to_update.save()
    
    return Response({
        'message': f'Member role updated to {member_to_update.get_role_display()} successfully',
        'new_role': new_role,
        'new_role_display': member_to_update.get_role_display()
    })

@api_view(['POST'])
def delete_team_view(request, team_id):
    """Delete an team (Owner only)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is the owner
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role != TeamMember.Role.OWNER:
        return Response({'error': 'Only owner can delete team'}, status=status.HTTP_403_FORBIDDEN)
    
    # Verify confirmation
    confirmation_name = request.data.get('confirmation_name')
    if confirmation_name != team.name:
        return Response({'error': 'Team name does not match'}, status=status.HTTP_400_BAD_REQUEST)
    
    team.delete()
    return Response({'message': 'Team deleted successfully'})

@api_view(['POST'])
def transfer_ownership_view(request, team_id, member_id):
    """Transfer team ownership to another member"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is the current owner
    requester_member = TeamMember.objects.get(team=team, user=request.user)
    if requester_member.role != TeamMember.Role.OWNER:
        return Response({'error': 'Only owner can transfer ownership'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the new owner
    new_owner_member = get_object_or_404(TeamMember, id=member_id, team=team)
    
    # Transfer ownership
    requester_member.role = TeamMember.Role.ADMIN  # Old owner becomes admin
    requester_member.save()
    
    new_owner_member.role = TeamMember.Role.OWNER  # New member becomes owner
    new_owner_member.save()
    
    # Update team created_by reference
    team.created_by = new_owner_member.user
    team.save()
    
    return Response({'message': 'Ownership transferred successfully'})



@api_view(['GET'])
def notifications_view(request):
    """Get user's notifications"""
    notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def mark_notification_read_view(request, notification_id):
    """Mark a notification as read"""
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.status = Notification.Status.READ
    notification.save()
    return Response({'message': 'Notification marked as read'})

@api_view(['POST'])
def mark_all_notifications_read_view(request):
    """Mark all user notifications as read"""
    Notification.objects.filter(user=request.user, status=Notification.Status.UNREAD).update(
        status=Notification.Status.READ
    )
    return Response({'message': 'All notifications marked as read'})

@api_view(['DELETE'])
def delete_notification_view(request, notification_id):
    """Delete a notification"""
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.delete()
    return Response({'message': 'Notification deleted'})

# In views.py - Update the invite_member_view function
@api_view(['POST'])
def invite_member_view(request, team_id):
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission to invite (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions to invite members'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = InvitationCreateSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        role = serializer.validated_data['role']
        
        # Check if user already exists and is already a member
        existing_user = User.objects.filter(email=email).first()
        if existing_user and TeamMember.objects.filter(team=team, user=existing_user).exists():
            return Response({'error': 'User is already a member of this team'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for existing pending invitation
        existing_invitation = TeamInvitation.objects.filter(
            email=email,
            team=team,
            status=TeamInvitation.Status.PENDING,
            expires_at__gt=timezone.now()
        ).first()
        
        if existing_invitation:
            return Response({'error': 'An active invitation already exists for this email'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create invitation
        invitation = TeamInvitation.objects.create(
            email=email,
            team=team,
            invited_by=request.user,
            token=str(uuid.uuid4()),
            role=role,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Send email invitation
        inviter_name = f"{request.user.first_name} {request.user.last_name}"
        email_sent = email_service.send_invitation_email(invitation, inviter_name, team.name)
        
        # Create notification for the invited user if they exist in the system
        if existing_user:
            Notification.objects.create(
                user=existing_user,
                type=Notification.Type.INVITATION,
                title="Team Invitation",
                message=f"{inviter_name} invited you to join {team.name}",
                related_id=invitation.id,
                action_url=f"/invitation/accept/{invitation.token}"
            )
        
        # ALSO create a notification for the inviter to track the invitation
        Notification.objects.create(
            user=request.user,
            type=Notification.Type.INVITATION,
            title="Invitation Sent",
            message=f"You invited {email} to join {team.name}",
            related_id=invitation.id
        )
        
        return Response({
            'message': f'Invitation sent to {email}',
            'invitation_id': invitation.id,
            'email_sent': email_sent,
            'user_exists': existing_user is not None
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def leave_team_view(request, team_id):
    team = get_object_or_404(Team, id=team_id)
    
    try:
        membership = TeamMember.objects.get(team=team, user=request.user)
        
        # Prevent owner from leaving (they should transfer ownership or delete team)
        if membership.role == TeamMember.Role.OWNER:
            return Response({'error': 'Owner cannot leave team. Transfer ownership or delete team instead.'}, status=status.HTTP_400_BAD_REQUEST)
        
        membership.delete()
        return Response({'message': 'Successfully left the team'})
    
    except TeamMember.DoesNotExist:
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(['GET', 'POST'])
def projects_view(request, team_id):
    """Get all projects for a team or create a new project"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        projects = Project.objects.filter(team=team)
        
        serializer = ProjectSerializer(projects, many=True)
        
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # DEBUG: Check user's team role
        team_member = TeamMember.objects.get(team=team, user=request.user)
        print(f"🔍 DEBUG: User {request.user.email} has team role: {team_member.role}")
        print(f"🔍 DEBUG: Required roles: {[TeamMember.Role.OWNER, TeamMember.Role.ADMIN]}")
        print(f"🔍 DEBUG: User in allowed roles: {team_member.role in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]}")
        
        # Check if user has permission to create projects (Owner, Admin, or specific role)
        if team_member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
            return Response({'error': 'Insufficient permissions to create projects'}, status=status.HTTP_403_FORBIDDEN)
        
        print("📥 Received project data:", request.data)  # Debug print
        
        # Add team to the data
        data = request.data.copy()
        data['team'] = team_id
        
        serializer = ProjectCreateSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            print("✅ Serializer is valid")
            project = serializer.save()
            
            # Add creator as project manager
            ProjectMember.objects.create(
                project=project,
                user=request.user,
                role=ProjectMember.Role.MANAGER
            )
            
            response_serializer = ProjectSerializer(project, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Serializer errors:", serializer.errors)  # Debug print
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def project_detail_view(request, team_id, project_id):
    """Get, update, or delete a specific project"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = ProjectSerializer(project)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Check if user has permission to edit project
        project_member = ProjectMember.objects.get(project=project, user=request.user)
        if project_member.role != ProjectMember.Role.MANAGER:
            return Response({'error': 'Insufficient permissions to edit project'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ProjectCreateSerializer(project, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            response_serializer = ProjectSerializer(project, context={'request': request})
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Check if user has permission to delete project
        project_member = ProjectMember.objects.get(project=project, user=request.user)
        if project_member.role != ProjectMember.Role.MANAGER:
            return Response({'error': 'Insufficient permissions to delete project'}, status=status.HTTP_403_FORBIDDEN)
        
        project.delete()
        return Response({'message': 'Project deleted successfully'})

# Project Members Management
@api_view(['GET', 'POST'])
def project_members_view(request, team_id, project_id):
    """Get project members or add a new member"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        members = ProjectMember.objects.filter(project=project)
        serializer = ProjectMemberSerializer(members, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Check if user has permission to add members
        project_member = ProjectMember.objects.get(project=project, user=request.user)
        if project_member.role != ProjectMember.Role.MANAGER:
            return Response({'error': 'Insufficient permissions to add members'}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        role = request.data.get('role', ProjectMember.Role.CONTRIBUTOR)
        
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists and is a team member
        try:
            user_to_add = User.objects.get(email=email)
            if not TeamMember.objects.filter(team=team, user=user_to_add, is_active=True).exists():
                return Response({'error': 'User is not a member of this team'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is already a project member
            if ProjectMember.objects.filter(project=project, user=user_to_add).exists():
                return Response({'error': 'User is already a member of this project'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Add user to project
            project_member = ProjectMember.objects.create(
                project=project,
                user=user_to_add,
                role=role
            )
            
            serializer = ProjectMemberSerializer(project_member)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response({'error': 'User with this email does not exist'}, status=status.HTTP_400_BAD_REQUEST)

# Task Views
@api_view(['GET', 'POST'])
def tasks_view(request, team_id, project_id):
    """Get all tasks for a project or create a new task"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        tasks = Task.objects.filter(project=project)
        
        # Filter by status if provided
        status_filter = request.GET.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        
        # Filter by assignee if provided
        assignee_filter = request.GET.get('assignee')
        if assignee_filter:
            tasks = tasks.filter(assignee_id=assignee_filter)
        
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TaskCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            task = serializer.save()
            response_serializer = TaskSerializer(task, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def task_detail_view(request, team_id, project_id, task_id):
    """Get, update, or delete a specific task"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    task = get_object_or_404(Task, id=task_id, project=project)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = TaskCreateSerializer(task, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            response_serializer = TaskSerializer(task, context={'request': request})
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only task creator or project manager can delete
        project_member = ProjectMember.objects.get(project=project, user=request.user)
        if task.created_by != request.user and project_member.role != ProjectMember.Role.MANAGER:
            return Response({'error': 'Insufficient permissions to delete task'}, status=status.HTTP_403_FORBIDDEN)
        
        task.delete()
        return Response({'message': 'Task deleted successfully'})

# Subtask Views
@api_view(['GET', 'POST'])
def subtasks_view(request, team_id, project_id, task_id):
    """Get all subtasks for a task or create a new subtask"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    task = get_object_or_404(Task, id=task_id, project=project)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        subtasks = Subtask.objects.filter(task=task)
        serializer = SubtaskSerializer(subtasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SubtaskCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            subtask = serializer.save()
            response_serializer = SubtaskSerializer(subtask, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def subtask_detail_view(request, team_id, project_id, task_id, subtask_id):
    """Get, update, or delete a specific subtask"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    task = get_object_or_404(Task, id=task_id, project=project)
    subtask = get_object_or_404(Subtask, id=subtask_id, task=task)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = SubtaskSerializer(subtask)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = SubtaskCreateSerializer(subtask, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            response_serializer = SubtaskSerializer(subtask, context={'request': request})
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only subtask creator or project manager can delete
        project_member = ProjectMember.objects.get(project=project, user=request.user)
        if subtask.created_by != request.user and project_member.role != ProjectMember.Role.MANAGER:
            return Response({'error': 'Insufficient permissions to delete subtask'}, status=status.HTTP_403_FORBIDDEN)
        
        subtask.delete()
        return Response({'message': 'Subtask deleted successfully'})

# Task Comments
@api_view(['GET', 'POST'])
def task_comments_view(request, team_id, project_id, task_id):
    """Get all comments for a task or create a new comment"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    task = get_object_or_404(Task, id=task_id, project=project)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        comments = TaskComment.objects.filter(task=task)
        serializer = TaskCommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TaskCommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            comment = serializer.save()
            response_serializer = TaskCommentSerializer(comment, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)