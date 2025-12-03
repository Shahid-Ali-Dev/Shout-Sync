from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .models import Organization, OrganizationMember, Invitation
from .serializers import OrganizationSerializer, OrganizationMemberSerializer, InvitationSerializer
from .permissions import IsOrganizationOwner, IsOrganizationAdmin

class OrganizationListCreateView(generics.ListCreateAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Organization.objects.filter(
            members__user=self.request.user,
            members__is_active=True,
            is_active=True
        ).distinct()
    
    def perform_create(self, serializer):
        organization = serializer.save(created_by=self.request.user)
        # Automatically add creator as owner
        OrganizationMember.objects.create(
            organization=organization,
            user=self.request.user,
            role='owner'
        )

class OrganizationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsOrganizationOwner]
    
    def get_queryset(self):
        return Organization.objects.filter(
            members__user=self.request.user,
            members__is_active=True,
            is_active=True
        ).distinct()

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrganizationAdmin])
def invite_member(request, organization_id):
    try:
        organization = Organization.objects.get(id=organization_id, is_active=True)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)
    
    email = request.data.get('email')
    role = request.data.get('role', 'member')
    
    # Check if invitation already exists
    existing_invitation = Invitation.objects.filter(
        organization=organization,
        email=email,
        status='pending'
    ).first()
    
    if existing_invitation:
        return Response({'error': 'Invitation already sent to this email'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create invitation
    invitation = Invitation.objects.create(
        organization=organization,
        email=email,
        invited_by=request.user,
        role=role,
        expires_at=timezone.now() + timedelta(days=7)
    )
    
    # Send invitation email (to be implemented)
    # send_invitation_email(invitation)
    
    serializer = InvitationSerializer(invitation)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_invitation(request, invitation_id):
    try:
        invitation = Invitation.objects.get(id=invitation_id, email=request.user.email)
    except Invitation.DoesNotExist:
        return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if invitation.status != 'pending':
        return Response({'error': 'Invitation already processed'}, status=status.HTTP_400_BAD_REQUEST)
    
    if invitation.expires_at < timezone.now():
        invitation.status = 'expired'
        invitation.save()
        return Response({'error': 'Invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    action = request.data.get('action')  # 'accept' or 'reject'
    
    if action == 'accept':
        # Add user to organization
        OrganizationMember.objects.create(
            organization=invitation.organization,
            user=request.user,
            role=invitation.role
        )
        invitation.status = 'accepted'
        invitation.save()
        return Response({'message': 'Successfully joined organization'})
    
    elif action == 'reject':
        invitation.status = 'rejected'
        invitation.save()
        return Response({'message': 'Invitation declined'})
    
    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)