from rest_framework import serializers
from .models import Organization, OrganizationMember, Invitation
from users.serializers import UserSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'logo', 'created_by', 'created_by_name', 
                 'created_at', 'member_count', 'is_active']
        read_only_fields = ['created_by', 'created_at']
    
    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = OrganizationMember
        fields = ['id', 'user', 'user_details', 'organization', 'role', 'joined_at', 'is_active']
        read_only_fields = ['joined_at']

class InvitationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'organization', 'organization_name', 'email', 'invited_by', 
                 'invited_by_name', 'role', 'status', 'created_at', 'expires_at']
        read_only_fields = ['invited_by', 'created_at', 'expires_at']