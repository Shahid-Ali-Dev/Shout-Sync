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
from .models import User, Team, TeamMember, TeamInvitation, Project, ProjectMember, Task, Subtask, TaskComment, TaskAttachment, TeamJoinRequest
from .serializers import *
from .notifications import *
from django.db.models import Count, OuterRef, Exists, Subquery, Prefetch, Q
from rest_framework.pagination import PageNumberPagination

class TeamMemberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
def team_members_optimized_view(request, team_id):
    """Get team members with pagination (optimized)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)
    
    # FIX 1: Add 'user__last_active' to the .only() list
    members = TeamMember.objects.filter(
        team=team, 
        is_active=True
    ).select_related('user').only(
        'id', 'role', 'joined_at',
        'user__id', 'user__email', 'user__first_name', 'user__last_name', 
        'user__avatar', 'user__last_active'  # <--- ADDED THIS
    )
    
    # Apply pagination
    total_count = members.count()
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    paginated_members = members[start_idx:end_idx]
    
    data = [{
        'id': str(member.id),
        'user': {
            'id': str(member.user.id),
            'email': member.user.email,
            'first_name': member.user.first_name,
            'last_name': member.user.last_name,
            'avatar': member.user.avatar.url if member.user.avatar else None,
            'last_active': member.user.last_active  
        },
        'role': member.role,
        'joined_at': member.joined_at
    } for member in paginated_members]
    
    return Response({
        'results': data,
        'total': total_count,
        'page': page,
        'page_size': page_size,
        'has_next': end_idx < total_count,
        'has_previous': page > 1
    })

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
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        
        # Return validation errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_availability_view(request):
    """
    Check if email or username is available (for real-time validation)
    """
    email = request.GET.get('email')
    username = request.GET.get('username')
    
    results = {}
    
    if email:
        email_exists = User.objects.filter(email=email).exists()
        results['email'] = {
            'available': not email_exists,
            'exists': email_exists,
            'message': 'Email already registered' if email_exists else 'Email available'
        }
    
    if username:
        username_exists = User.objects.filter(username=username).exists()
        results['username'] = {
            'available': not username_exists,
            'exists': username_exists,
            'message': 'Username already taken' if username_exists else 'Username available'
        }
    
    return Response(results)

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

@api_view(['POST'])
def create_project_optimized(request, team_id):
    """Optimized project creation endpoint"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    team_member = TeamMember.objects.filter(team=team, user=request.user, is_active=True).first()
    if not team_member:
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = ProjectCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        # Use the same serializer create method (already optimized)
        project = serializer.save()
        
        return Response({
            'success': True,
            'project': ProjectSerializer(project, context={'request': request}).data,
            'message': 'Project created successfully'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Add search endpoint for team members
@api_view(['GET'])
def search_team_members_view(request, team_id):
    """Search team members with filters"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is member of this team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    search_query = request.GET.get('q', '')
    role_filter = request.GET.get('role')
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)
    
    # FIXED: Use select_related with specific fields and force fresh query
    members_query = TeamMember.objects.filter(
        team=team, 
        is_active=True
    ).select_related('user').only(
        'id', 'role', 'joined_at',
        'user__id', 'user__email', 'user__first_name', 'user__last_name', 
        'user__avatar', 'user__last_active'  # <-- Explicitly include last_active
    )
    
    # Apply search filter
    if search_query:
        members_query = members_query.filter(
            Q(user__email__icontains=search_query) |
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query)
        )
    
    # Apply role filter
    if role_filter and role_filter != 'all':
        members_query = members_query.filter(role=int(role_filter))
    
    # FIXED: Force fresh database query (no caching)
    members_query = members_query.all()  # This forces evaluation
    
    # Apply pagination
    total_count = members_query.count()
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    members = members_query[start_idx:end_idx]
    
    # FIXED: Debug logging
    for member in members:
        print(f"DEBUG Member: {member.user.email} - last_active: {member.user.last_active}")
    
    data = [{
        'id': str(member.id),
        'user': {
            'id': str(member.user.id),
            'email': member.user.email,
            'first_name': member.user.first_name,
            'last_name': member.user.last_name,
            'avatar': member.user.avatar.url if member.user.avatar else None,
            'last_active': member.user.last_active.isoformat() if member.user.last_active else None  # <-- Ensure ISO format
        },
        'role': member.role,
        'joined_at': member.joined_at
    } for member in members]
    
    return Response({
        'results': data,
        'total': total_count,
        'page': page,
        'page_size': page_size,
        'has_next': end_idx < total_count,
        'has_previous': page > 1
    })

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
    

from django.db.models import Count, Q, Prefetch # Make sure Q and Prefetch are imported

@api_view(['GET'])
def user_dashboard_stats_view(request):
    """
    Aggregated endpoint for Dashboard.
    Fixes: Avatar loading, Member counting, and Total Project counts.
    """
    user = request.user
    today = timezone.now()
    tomorrow = today + timedelta(days=1)

    # 1. Get User's Team IDs first (Critical for accurate counting)
    # We get IDs to create a fresh query later that doesn't filter by "request.user"
    user_team_ids = Team.objects.filter(
        members__user=user, 
        members__is_active=True
    ).values_list('id', flat=True)

    # 2. Get Projects (Top 5 Recent) WITH AVATARS
    # We prefetch 'assignees' so we can show their faces on the dashboard
    recent_projects = Project.objects.filter(team_id__in=user_team_ids).select_related(
        'team', 'created_by'
    ).prefetch_related(
        Prefetch('assignees', queryset=User.objects.only('id', 'first_name', 'last_name', 'avatar'))
    ).annotate(
        active_task_count=Count('tasks'),
        active_member_count=Count('memberships', distinct=True),
    ).order_by('-updated_at')[:5]

    # 3. Get User Tasks
    user_tasks = Task.objects.filter(assignee=user).select_related(
        'project', 'project__team'
    ).order_by('due_date')

    # 4. Calculate GLOBAL Stats (The "Total" numbers)
    total_projects = Project.objects.filter(team_id__in=user_team_ids).count()
    active_projects = Project.objects.filter(team_id__in=user_team_ids, status=2).count()
    completed_tasks_count = Task.objects.filter(assignee=user, status=5).count()
    
    due_tasks_query = user_tasks.filter(due_date__lte=tomorrow, status__lt=5)
    due_tasks_count = due_tasks_query.count()
    
    # Fix Unique Member Count: Query TeamMember directly using the Team IDs
    unique_members_count = TeamMember.objects.filter(
        team_id__in=user_team_ids, 
        is_active=True
    ).values('user').distinct().count()

    # 5. Serialize Projects (Manually to include team_members avatars)
    projects_data = []
    for p in recent_projects:
        total_p_tasks = p.tasks.count()
        done_p_tasks = p.tasks.filter(status=5).count()
        progress = int((done_p_tasks / total_p_tasks) * 100) if total_p_tasks > 0 else 0
        
        # Extract first 3 avatars manually
        avatars = []
        for assignee in p.assignees.all()[:3]:
            avatars.append({
                'user': {
                    'first_name': assignee.first_name,
                    'last_name': assignee.last_name,
                    'avatar': assignee.avatar.url if assignee.avatar else None
                }
            })

        projects_data.append({
            'id': str(p.id),
            'name': p.name,
            'description': p.description,
            'status': p.status,
            'progress': progress,
            'team_name': p.team.name,
            'team_id': str(p.team.id),
            'member_count': p.active_member_count,
            'task_count': p.active_task_count,
            'start_date': p.start_date,
            'end_date': p.end_date,
            'created_by_name': f"{p.created_by.first_name} {p.created_by.last_name}",
            'team_members': avatars # <--- This fixes the missing profiles
        })

    # Serialize Tasks
    due_tasks_data = [{
        'id': str(t.id),
        'title': t.title,
        'status': t.status,
        'priority': t.priority,
        'due_date': t.due_date,
        'project_name': t.project.name,
        'project_id': str(t.project.id),
        'team_id': str(t.project.team.id)
    } for t in due_tasks_query[:5]]

    recent_tasks_data = [{
        'id': str(t.id),
        'title': t.title,
        'status': t.status,
        'priority': t.priority,
        'due_date': t.due_date,
        'project_name': t.project.name,
        'project_id': str(t.project.id),
        'team_id': str(t.project.team.id)
    } for t in user_tasks.order_by('-updated_at')[:5]]

    # 6. Serialize Teams (Fixing the "1 member" bug)
    # We query Team FRESH using the IDs to avoid the previous filter inheritance
    teams_queryset = Team.objects.filter(id__in=user_team_ids).annotate(
        real_member_count=Count('members', filter=Q(members__is_active=True), distinct=True),
        real_project_count=Count('projects', distinct=True)
    ).select_related('created_by').order_by('-real_project_count', 'name')

    all_teams_data = []
    for t in teams_queryset:
        all_teams_data.append({
            'id': str(t.id),
            'name': t.name,
            'description': t.description,
            'member_count': t.real_member_count,     # Uses fresh annotation (Corrects "1 member" issue)
            'project_count': t.real_project_count,   
            'created_by_name': f"{t.created_by.first_name} {t.created_by.last_name}"
        })

    return Response({
        'stats': {
            'totalTeams': len(user_team_ids),
            'totalProjects': total_projects, # Uses DB count (e.g. 100), not list length (5)
            'activeProjects': active_projects,
            'completedTasks': completed_tasks_count,
            'tasksDueToday': due_tasks_count,
            'teamMembers': unique_members_count # Fixed logic
        },
        'recent_projects': projects_data,
        'due_tasks': due_tasks_data,
        'recent_tasks': recent_tasks_data,
        'all_teams': all_teams_data 
    })
    
@api_view(['GET', 'POST'])
def projects_view(request, team_id):
    team = get_object_or_404(Team, id=team_id)
    
    team_member = TeamMember.objects.filter(team=team, user=request.user, is_active=True).first()
    if not team_member:
        return Response({'error': 'Not a member'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        # 1. SHARED OPTIMIZATION (Make it fast for everyone)
        is_favorite_subquery = Project.favorited_by.through.objects.filter(
            project_id=OuterRef('pk'),
            user_id=request.user.id
        )

        projects = Project.objects.filter(team=team).select_related(
            'created_by', 'team'
        ).prefetch_related(
            'assignee_relations', 
            'assignee_relations__user',
            'memberships',
            'permissions'
        ).annotate(
            active_task_count=Count('tasks'),
            active_member_count=Count('memberships', distinct=True),
            is_user_favorite=Exists(is_favorite_subquery)
        ).order_by('-created_at')

        # 2. CONDITIONAL PAGINATION (The Magic Fix)
        # Only paginate if the frontend specifically asks for a 'page'
        if request.query_params.get('page'):
            paginator = PageNumberPagination()
            paginator.page_size = 50
            result_page = paginator.paginate_queryset(projects, request)
            serializer = ProjectSerializer(result_page, many=True, context={'request': request})
            # Returns { count: 100, results: [...] } -> For ProjectList
            return paginator.get_paginated_response(serializer.data)
        
        else:
            # Returns [...] -> For Sidebar, Dashboard, etc. (No frontend changes needed!)
            serializer = ProjectSerializer(projects, many=True, context={'request': request})
            return Response(serializer.data)
    
    elif request.method == 'POST':
        # DEBUG: Check user's team role and permissions
        print(f"🔍 DEBUG: User {request.user.email} has team role: {team_member.role}")
        print(f"🔍 DEBUG: Team settings: {team.settings}")
        
        # Check team settings for project creation permissions
        team_settings = team.settings
        permissions = team_settings.get('permissions', {})
        
        # Allow project creation for:
        # - Owners and Admins (always)
        # - Members if team settings allow it
        if team_member.role in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
            # Owners and Admins can always create projects
            can_create = True
        elif team_member.role == TeamMember.Role.MEMBER:
            # Members can create if team settings allow it
            can_create = permissions.get('members_can_create_projects', False)
        else:
            # Guests cannot create projects
            can_create = False
        
        print(f"🔍 DEBUG: Can create project: {can_create}")
        
        if not can_create:
            return Response({
                'error': 'Insufficient permissions to create projects in this team',
                'user_role': team_member.get_role_display(),
                'required_permission': 'members_can_create_projects',
                'current_setting': permissions.get('members_can_create_projects', False)
            }, status=status.HTTP_403_FORBIDDEN)
        
        print("📥 Received project data:", request.data)
        
        # Add team to the data
        data = request.data.copy()
        data['team'] = team_id
        
        serializer = ProjectCreateSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            project = serializer.save()  # This already adds the creator as a member in the serializer
            
            # REMOVE THESE LINES - They're causing the duplicate error
            # # Add creator as project manager
            # ProjectMember.objects.create(
            #     project=project,
            #     user=request.user,
            #     role=ProjectMember.Role.MANAGER
            # )
            
            # Create activity log
            create_activity_log(
                user=request.user,
                action_type=ActivityLog.ActionType.PROJECT_CREATED,
                description=f"Created project '{project.name}'",
                details={
                    'project_id': str(project.id),
                    'project_name': project.name,
                    'team_id': str(team.id),
                    'team_name': team.name
                },
                team=team,
                project=project
            )
            
            # Notify team members
            notify_team_members(
                team=team,
                title="🎯 New Project Created",
                message=f"{request.user.first_name} created a new project: '{project.name}'",
                related_id=project.id,
                action_url=f"/team/{team.id}/project/{project.id}",
                sender=request.user
            )
            
            response_serializer = ProjectSerializer(project, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def project_detail_view(request, team_id, project_id):
    team = get_object_or_404(Team, id=team_id)
    
    # OPTIMIZATION: Fetch project with all related data AND annotations
    if request.method == 'GET':
        # Define the favorite subquery
        is_favorite_subquery = Project.favorited_by.through.objects.filter(
            project_id=OuterRef('pk'),
            user_id=request.user.id
        )

        project = get_object_or_404(
            Project.objects.select_related('team', 'created_by')
            .prefetch_related(
                'assignee_relations', 
                'assignee_relations__user',
                'memberships',
                'permissions'
            ).annotate(
                # Add the annotations here too so the Detail page is fast
                active_task_count=Count('tasks'),
                active_member_count=Count('memberships', distinct=True),
                is_user_favorite=Exists(is_favorite_subquery)
            ), 
            id=project_id, 
            team=team
        )
    else:
        # For PUT/DELETE we don't need heavy annotations
        project = get_object_or_404(Project, id=project_id, team=team)
    
    # Get user's permissions
    permission = get_user_project_permissions(request.user, project)
    
    if not permission:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = ProjectSerializer(project, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Check what fields user is trying to update
        allowed_updates = {}
        
        # 1. Handle Basic Fields
        if 'name' in request.data:
            if permission.can_edit_name: allowed_updates['name'] = request.data['name']
            else: return Response({'error': 'No permission to edit name'}, status=status.HTTP_403_FORBIDDEN)
        
        if 'description' in request.data:
            if permission.can_edit_description: allowed_updates['description'] = request.data['description']
            else: return Response({'error': 'No permission to edit description'}, status=status.HTTP_403_FORBIDDEN)

        if 'start_date' in request.data:
            if permission.can_edit_dates: allowed_updates['start_date'] = request.data['start_date']
            else: return Response({'error': 'No permission to edit dates'}, status=status.HTTP_403_FORBIDDEN)

        if 'end_date' in request.data:
            if permission.can_edit_dates: allowed_updates['end_date'] = request.data['end_date']
            else: return Response({'error': 'No permission to edit dates'}, status=status.HTTP_403_FORBIDDEN)

        if 'status' in request.data:
            if permission.can_edit_status: allowed_updates['status'] = request.data['status']
            else: return Response({'error': 'No permission to edit status'}, status=status.HTTP_403_FORBIDDEN)

        # 2. Handle Team Transfer
        if 'team' in request.data and str(request.data['team']) != str(team.id):
            if permission.can_transfer_project:
                # ... (Keep your existing target team permission check here) ...
                allowed_updates['team'] = request.data['team']
            else:
                return Response({'error': 'No permission to transfer project'}, status=status.HTTP_403_FORBIDDEN)
        
        

        # 3. Handle Assignees Properly - FIXED VERSION
        if 'assignee_ids' in request.data and 'assignee_roles' in request.data:
            if permission.can_manage_members or permission.can_assign_tasks:
                assignee_ids = request.data.get('assignee_ids', [])
                assignee_roles = request.data.get('assignee_roles', [])
                
                # Get current assignees to track what to remove
                current_assignees = ProjectAssignee.objects.filter(project=project)
                current_assignee_user_ids = [str(a.user.id) for a in current_assignees]
                
                # Track users to keep (from new list)
                users_to_keep = []
                
                # Update or create assignees
                for i, assignee_id in enumerate(assignee_ids):
                    try:
                        assignee_user = User.objects.get(id=assignee_id)
                        role = assignee_roles[i] if i < len(assignee_roles) else 1
                        
                        # Check if user is a team member
                        if not TeamMember.objects.filter(team=team, user=assignee_user, is_active=True).exists():
                            continue
                        
                        users_to_keep.append(str(assignee_user.id))
                        
                        # Ensure project membership
                        ProjectMember.objects.update_or_create(
                            project=project,
                            user=assignee_user,
                            defaults={'role': ProjectMember.Role.CONTRIBUTOR}
                        )
                        
                        # UPDATE OR CREATE assignee entry - THIS IS THE FIX
                        ProjectAssignee.objects.update_or_create(
                            project=project,
                            user=assignee_user,
                            defaults={
                                'role': role,
                                'assigned_by': request.user,
                                'is_lead': (role == 3)
                            }
                        )
                        
                    except User.DoesNotExist:
                        continue
                
                # Remove assignees not in the new list (except creator)
            for assignee in current_assignees:
                    if str(assignee.user.id) not in users_to_keep and assignee.user != project.created_by:
                        # 1. Capture the user before deleting the assignee record
                        user_to_remove = assignee.user
                        
                        # 2. Delete the Assignee record (Removes from Dialog)
                        assignee.delete()
                        
                        # 3. FIX: Also delete the ProjectMember record (Fixes the Count on Dashboard)
                        ProjectMember.objects.filter(
                            project=project, 
                            user=user_to_remove
                        ).delete()
                        
                        # 4. Also remove any specific permissions they had
                        ProjectPermission.objects.filter(
                            project=project,
                            user=user_to_remove
                        ).delete()
            else:
                return Response({'error': 'No permission to manage assignees'}, status=status.HTTP_403_FORBIDDEN)

        # 4. Save updates
        serializer = ProjectCreateSerializer(project, data=allowed_updates, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            # ... logging code ...
            # Response serializer uses the SAFE ProjectSerializer we just fixed
            response_serializer = ProjectSerializer(project, context={'request': request})
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only project creator or team owner/admin can delete
        if not (project.created_by == request.user or permission.can_delete_project):
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
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

# In views.py - add these new views

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def request_to_join_team_view(request, team_id):
    """Allow users to request to join a team (public endpoint)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Get user info from request
    email = request.data.get('email')
    message = request.data.get('message', '')
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user exists
    try:
        requesting_user = User.objects.get(email=email)
        user_exists = True
    except User.DoesNotExist:
        user_exists = False
        requesting_user = None
    
    # Check if user is already a member
    if user_exists and TeamMember.objects.filter(team=team, user=requesting_user).exists():
        return Response({'error': 'You are already a member of this team'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for existing pending requests
    existing_request = TeamJoinRequest.objects.filter(
        email=email,
        team=team,
        status=TeamJoinRequest.Status.PENDING
    ).first()
    
    if existing_request:
        return Response({'error': 'You already have a pending request to join this team'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create join request
    join_request = TeamJoinRequest.objects.create(
        email=email,
        team=team,
        message=message,
        user=requesting_user if user_exists else None
    )
    
    # Get team admins and owner
    admins_and_owner = TeamMember.objects.filter(
        team=team,
        role__in=[TeamMember.Role.OWNER, TeamMember.Role.ADMIN],
        is_active=True
    )
    
    # Create notifications for admins and owner
    for admin_member in admins_and_owner:
        Notification.objects.create(
            user=admin_member.user,
            type=Notification.Type.JOIN_REQUEST,
            title="Join Request",
            message=f"{email} wants to join {team.name}",
            related_id=join_request.id,
            action_url=f"/team/{team.id}/join-requests"
        )
    
    return Response({
        'message': 'Join request sent successfully',
        'request_id': str(join_request.id),
        'user_exists': user_exists
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def team_join_requests_view(request, team_id):
    """Get pending join requests for a team (Admin/Owner only)"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    join_requests = TeamJoinRequest.objects.filter(team=team, status=TeamJoinRequest.Status.PENDING)
    serializer = TeamJoinRequestSerializer(join_requests, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def transfer_project_view(request, team_id, project_id):
    """Transfer project to another team (Owner/Admin only)"""
    source_team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=source_team)
    
    # Check if user is a member of the source team
    source_membership = get_object_or_404(
        TeamMember, 
        team=source_team, 
        user=request.user,
        is_active=True
    )
    
    # Only owner or admin can transfer projects
    if source_membership.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response(
            {'error': 'Only team owners or admins can transfer projects'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    target_team_id = request.data.get('target_team_id')
    if not target_team_id:
        return Response({'error': 'Target team ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    target_team = get_object_or_404(Team, id=target_team_id)
    
    # Check if user is also a member of the target team
    try:
        target_membership = TeamMember.objects.get(
            team=target_team,
            user=request.user,
            is_active=True
        )
    except TeamMember.DoesNotExist:
        return Response(
            {'error': 'You are not a member of the target team'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check permissions based on role AND team settings
    team_settings = target_team.settings
    permissions = team_settings.get('permissions', {})
    
    can_transfer_in = False

    # Owners and Admins can always accept transferred projects
    if target_membership.role in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        can_transfer_in = True
    # Members can transfer in if they are allowed to create projects
    elif target_membership.role == TeamMember.Role.MEMBER:
        can_transfer_in = permissions.get('members_can_create_projects', False)
    
    if not can_transfer_in:
        return Response({
            'error': 'You do not have permission to create/transfer projects in the target team',
            'user_role': target_membership.get_role_display(),
            'required_permission': 'members_can_create_projects'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if project already exists in target team (by name)
    existing_project = Project.objects.filter(
        team=target_team, 
        name=project.name
    ).first()
    
    if existing_project:
        return Response({
            'error': f'A project named "{project.name}" already exists in {target_team.name}',
            'existing_project_id': str(existing_project.id)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save the original team for notifications
    original_team = source_team
    
    # Transfer the project
    project.team = target_team
    project.save()
    
    # Create notifications and activity logs
    notification_details = create_project_transfer_notifications(
        source_team=original_team,
        target_team=target_team,
        project=project,
        transferrer=request.user
    )
    
    # Remove project members who are not in the target team
    project_members = ProjectMember.objects.filter(project=project).select_related('user')
    for member in project_members:
        if not TeamMember.objects.filter(
            team=target_team, 
            user=member.user, 
            is_active=True
        ).exists():
            member.delete()
            
            # Log the removal
            create_activity_log(
                user=request.user,
                action_type=ActivityLog.ActionType.MEMBER_REMOVED,
                description=f"Removed {member.user.email} from project '{project.name}' during team transfer",
                details={
                    'project_id': str(project.id),
                    'project_name': project.name,
                    'removed_user_id': str(member.user.id),
                    'removed_user_email': member.user.email,
                    'reason': 'User not in target team'
                },
                team=target_team,
                project=project
            )
    
    return Response({
        'message': f'Project transferred to {target_team.name} successfully',
        'project_id': str(project.id),
        'new_team_id': str(target_team.id),
        'new_team_name': target_team.name,
        'notification_details': notification_details
    })

@api_view(['POST'])
def approve_join_request_view(request, team_id, request_id):
    """Approve a join request (Admin/Owner only)"""
    team = get_object_or_404(Team, id=team_id)
    join_request = get_object_or_404(TeamJoinRequest, id=request_id, team=team)
    
    # Check if user has permission (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if request is still pending
    if join_request.status != TeamJoinRequest.Status.PENDING:
        return Response({'error': 'This request has already been processed'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user exists
    try:
        user_to_add = User.objects.get(email=join_request.email)
        
        # Add user to team as member
        TeamMember.objects.create(
            user=user_to_add,
            team=team,
            role=TeamMember.Role.MEMBER
        )
        
        # Update request status
        join_request.status = TeamJoinRequest.Status.APPROVED
        join_request.processed_by = request.user
        join_request.processed_at = timezone.now()
        join_request.save()
        
        # Create notification for the user
        if user_to_add:
            Notification.objects.create(
                user=user_to_add,
                type=Notification.Type.JOIN_REQUEST,
                title="Join Request Approved",
                message=f"Your request to join {team.name} has been approved",
                related_id=join_request.id,
                action_url=f"/team/{team.id}"
            )
        
        return Response({'message': 'Join request approved successfully'})
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def reject_join_request_view(request, team_id, request_id):
    """Reject a join request (Admin/Owner only)"""
    team = get_object_or_404(Team, id=team_id)
    join_request = get_object_or_404(TeamJoinRequest, id=request_id, team=team)
    
    # Check if user has permission (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if request is still pending
    if join_request.status != TeamJoinRequest.Status.PENDING:
        return Response({'error': 'This request has already been processed'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update request status
    join_request.status = TeamJoinRequest.Status.REJECTED
    join_request.processed_by = request.user
    join_request.processed_at = timezone.now()
    join_request.save()
    
    # Create notification for the user if they exist
    try:
        user = User.objects.get(email=join_request.email)
        Notification.objects.create(
            user=user,
            type=Notification.Type.JOIN_REQUEST,
            title="Join Request Declined",
            message=f"Your request to join {team.name} has been declined",
            related_id=join_request.id
        )
    except User.DoesNotExist:
        pass
    
    return Response({'message': 'Join request rejected successfully'})

@api_view(['GET', 'PUT'])
def team_settings_view(request, team_id):
    """Get or update team settings"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = TeamSettingsSerializer(team)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = TeamSettingsUpdateSerializer(data=request.data)
        if serializer.is_valid():
            # Update settings
            settings_data = serializer.validated_data
            
            # Deep merge the settings
            current_settings = team.settings.copy()
            
            for category, values in settings_data.items():
                if category not in current_settings:
                    current_settings[category] = {}
                current_settings[category].update(values)
            
            team.settings = current_settings
            team.save()
            
            # Return updated settings
            response_serializer = TeamSettingsSerializer(team)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
def update_team_setting_view(request, team_id):
    """Update a specific team setting using dot notation"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user has permission (Owner or Admin)
    member = TeamMember.objects.get(team=team, user=request.user)
    if member.role not in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    setting_path = request.data.get('path')
    value = request.data.get('value')
    
    if not setting_path:
        return Response({'error': 'Setting path is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate the setting path
    allowed_paths = {
        'security.allow_public_invites',
        'security.require_approval', 
        'security.default_role',
        'security.allow_guest_access',
        'features.enable_team_analytics',
        'features.enable_file_sharing',
        'features.max_file_size',
        'features.enable_team_chat',
        'permissions.members_can_create_projects',
        'permissions.members_can_invite',
        'permissions.guests_can_view'
    }
    
    if setting_path not in allowed_paths:
        return Response({'error': 'Invalid setting path'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate value based on path
    validation_errors = validate_setting_value(setting_path, value)
    if validation_errors:
        return Response({'error': validation_errors}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update the setting
    team.update_setting(setting_path, value)
    
    return Response({
        'message': 'Setting updated successfully',
        'path': setting_path,
        'value': value
    })

def validate_setting_value(path, value):
    """Validate setting value based on path"""
    if path == 'security.default_role':
        if value not in [2, 3, 4]:  # Admin, Member, Guest
            return "Default role must be 2 (Admin), 3 (Member), or 4 (Guest)"
    
    elif path == 'features.max_file_size':
        if not isinstance(value, int) or value < 1 or value > 1000:
            return "Max file size must be an integer between 1 and 1000 MB"
    
    elif path in ['security.allow_public_invites', 'security.require_approval', 
                  'security.allow_guest_access', 'features.enable_team_analytics',
                  'features.enable_file_sharing', 'features.enable_team_chat',
                  'permissions.members_can_create_projects', 'permissions.members_can_invite',
                  'permissions.guests_can_view']:
        if not isinstance(value, bool):
            return "Value must be true or false"
    
    return None

@api_view(['GET'])
def team_activity_view(request, team_id):
    """Get activity logs for a team"""
    team = get_object_or_404(Team, id=team_id)
    
    # Check if user is team member
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filters from query params
    action_type = request.GET.get('action_type')
    days = int(request.GET.get('days', 30))
    
    # Calculate date range
    from_date = timezone.now() - timedelta(days=days)
    
    # Get activities
    activities = ActivityLog.objects.filter(
        team=team,
        created_at__gte=from_date
    )
    
    if action_type:
        activities = activities.filter(action_type=action_type)
    
    activities = activities.select_related('user', 'project').order_by('-created_at')
    
    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def project_activity_view(request, team_id, project_id):
    """Get activity logs for a specific project"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    
    # Check if user is project member
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return Response({'error': 'Not a member of this project'}, status=status.HTTP_403_FORBIDDEN)
    
    days = int(request.GET.get('days', 30))
    from_date = timezone.now() - timedelta(days=days)
    
    activities = ActivityLog.objects.filter(
        project=project,
        created_at__gte=from_date
    ).select_related('user').order_by('-created_at')
    
    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def recent_activity_view(request, team_id):
    """Get recent activity across user's teams"""
    team = get_object_or_404(Team, id=team_id)
    
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)
    
    limit = int(request.GET.get('limit', 10))
    
    # Get all teams the user is a member of
    user_teams = Team.objects.filter(
        members__user=request.user,
        members__is_active=True
    )
    
    # Get recent activities from all user's teams
    activities = ActivityLog.objects.filter(
        team__in=user_teams
    ).select_related('user', 'team', 'project').order_by('-created_at')[:limit]
    
    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)

# Add helper function at the top of views.py
def get_user_project_permissions(user, project):
    """
    Get or calculate user's permissions for a project.
    Optimized to calculate in-memory without writing to DB on GET requests.
    """
    # 1. OPTIMIZATION: Check if permissions are already prefetched on the project object
    # This leverages the prefetch_related('permissions') you added to the view
    if hasattr(project, '_prefetched_objects_cache') and 'permissions' in project._prefetched_objects_cache:
        # Look for this user's permission in the cached list
        permission = next((p for p in project.permissions.all() if p.user_id == user.id), None)
        if permission:
            return permission

    # 2. Fallback: Query DB if not cached (but don't create yet)
    permission = ProjectPermission.objects.filter(project=project, user=user).first()
    if permission:
        return permission

    # 3. If no specific permission object exists, calculate dynamically (IN MEMORY ONLY)
    
    # Check if user is a member of the team at all
    team_member = TeamMember.objects.filter(team=project.team, user=user, is_active=True).first()
    if not team_member:
        return None

    # Determine Permission Level
    level = ProjectPermission.PermissionLevel.VIEW_ONLY

    # A. Check Team Level Roles (Overrides everything)
    if team_member.role in [TeamMember.Role.OWNER, TeamMember.Role.ADMIN]:
        level = ProjectPermission.PermissionLevel.ADMIN
    else:
        # B. Check Project Assignee Status
        assignee = ProjectAssignee.objects.filter(project=project, user=user).first()
        
        if assignee:
            # Map Assignee Roles to Permission Levels
            if assignee.role == ProjectAssignee.AssigneeRole.LEAD:
                level = ProjectPermission.PermissionLevel.EDIT_ALL
            elif assignee.role == ProjectAssignee.AssigneeRole.MANAGER:
                level = ProjectPermission.PermissionLevel.EDIT_ALL
            else: 
                # Contributors (Role 1) - Edit Basic Info
                level = ProjectPermission.PermissionLevel.EDIT_BASIC
        
        # C. Check Old ProjectMember model (backward compatibility)
        elif ProjectMember.objects.filter(project=project, user=user).exists():
            level = ProjectPermission.PermissionLevel.EDIT_BASIC

    # 4. Instantiate temporary object (DO NOT SAVE to DB)
    # We create the object in memory so the serializer can read it
    temp_permission = ProjectPermission(project=project, user=user, level=level)

    # 5. Manually set the boolean flags 
    # (Because we aren't calling .save(), we must replicate the model's save logic here)
    if level == ProjectPermission.PermissionLevel.VIEW_ONLY:
        temp_permission.can_edit_name = False
        temp_permission.can_edit_description = False
        temp_permission.can_edit_dates = False
        temp_permission.can_edit_status = False
        temp_permission.can_assign_tasks = False
        temp_permission.can_manage_members = False
        temp_permission.can_transfer_project = False
        temp_permission.can_delete_project = False

    elif level == ProjectPermission.PermissionLevel.EDIT_BASIC:
        temp_permission.can_edit_name = True
        temp_permission.can_edit_description = True
        temp_permission.can_edit_dates = True
        temp_permission.can_edit_status = True
        temp_permission.can_assign_tasks = True
        temp_permission.can_manage_members = False
        temp_permission.can_transfer_project = False
        temp_permission.can_delete_project = False

    elif level == ProjectPermission.PermissionLevel.EDIT_ALL:
        temp_permission.can_edit_name = True
        temp_permission.can_edit_description = True
        temp_permission.can_edit_dates = True
        temp_permission.can_edit_status = True
        temp_permission.can_assign_tasks = True
        temp_permission.can_manage_members = True
        temp_permission.can_transfer_project = False
        temp_permission.can_delete_project = False

    elif level == ProjectPermission.PermissionLevel.ADMIN:
        temp_permission.can_edit_name = True
        temp_permission.can_edit_description = True
        temp_permission.can_edit_dates = True
        temp_permission.can_edit_status = True
        temp_permission.can_assign_tasks = True
        temp_permission.can_manage_members = True
        temp_permission.can_transfer_project = True
        temp_permission.can_delete_project = True

    return temp_permission

# views.py (Check if this exists at the bottom)

@api_view(['POST'])
def toggle_project_favorite_view(request, team_id, project_id):
    """Toggle the favorite status of a project for the current user"""
    team = get_object_or_404(Team, id=team_id)
    project = get_object_or_404(Project, id=project_id, team=team)
    
    # Check if user is a member of the team
    if not TeamMember.objects.filter(team=team, user=request.user, is_active=True).exists():
        return Response({'error': 'Not a member of this team'}, status=status.HTTP_403_FORBIDDEN)

    is_favorite = False
    
    # Toggle logic
    if request.user in project.favorited_by.all():
        project.favorited_by.remove(request.user)
        is_favorite = False
    else:
        project.favorited_by.add(request.user)
        is_favorite = True
        
    return Response({
        'status': 'success', 
        'is_favorite': is_favorite,
        'project_id': str(project.id)
    })