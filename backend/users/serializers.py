from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Notification, User, Team, TeamMember, TeamInvitation, UserProfile, SheetColumn, Cell, SheetRow, ProjectSheet, SheetView, SheetComment
from .models import Project, ProjectMember, Task, Subtask, TaskComment, TaskAttachment

# Remove the circular import line and keep UserSerializer definition here

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password')
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError('Email and password are required')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_verified', 'last_active')

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = TeamMember
        fields = ('id', 'user', 'user_email', 'role', 'joined_at', 'is_active')

class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'logo', 'created_by', 'created_by_name', 'members', 'member_count', 'created_at', 'updated_at')
        read_only_fields = ('created_by', 'created_by_name', 'members', 'member_count', 'created_at', 'updated_at')
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

class TeamInvitationSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    invited_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamInvitation
        fields = ('id', 'email', 'team', 'team_name', 'invited_by', 'invited_by_name', 'role', 'status', 'created_at', 'expires_at')
    
    def get_invited_by_name(self, obj):
        return f"{obj.invited_by.first_name} {obj.invited_by.last_name}"

class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=TeamMember.Role.choices, default=TeamMember.Role.MEMBER)

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ('id', 'type', 'status', 'title', 'message', 'related_id', 'action_url', 'created_at', 'time_ago')
    
    def get_time_ago(self, obj):
        """Return human-readable time difference"""
        from django.utils import timezone
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('email_notifications', 'push_notifications', 'created_at', 'updated_at')

class UserWithProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_verified', 'last_active', 'profile')

# Project-related serializers - FIXED: No circular import
class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = ProjectMember
        fields = ('id', 'user', 'user_email', 'role', 'joined_at')

class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = Project
        fields = (
            'id', 'team', 'team_name', 'name', 'description', 'start_date', 'end_date',
            'status', 'created_by', 'created_by_name', 'members', 'member_count',
            'task_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_by', 'created_by_name', 'members', 'member_count', 'task_count')
    
    def get_member_count(self, obj):
        return obj.memberships.count()
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

# In serializers.py, update TaskSerializer
class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserSerializer(source='assignee', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    subtask_count = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Task
        fields = (
            'id', 'project', 'project_name', 'title', 'description', 'status',
            'priority', 'start_date', 'end_date', 'due_date', 'assignee',  
            'assignee_details', 'created_by', 'created_by_details', 
            'subtask_count', 'completed_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_by', 'created_by_details', 'subtask_count', 'completed_at')
    
    def get_subtask_count(self, obj):
        return obj.subtasks.count()
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

class SubtaskSerializer(serializers.ModelSerializer):
    assignee_details = UserSerializer(source='assignee', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    
    class Meta:
        model = Subtask
        fields = (
            'id', 'task', 'task_title', 'title', 'description', 'status',
            'due_date', 'assignee', 'assignee_details', 'created_by',
            'created_by_details', 'completed_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_by', 'created_by_details', 'completed_at')
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

class TaskCommentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = ('id', 'task', 'user', 'user_details', 'content', 'created_at', 'updated_at')
        read_only_fields = ('user', 'user_details')
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)
    
    class Meta:
        model = TaskAttachment
        fields = ('id', 'task', 'file', 'file_name', 'file_size', 'uploaded_by', 'uploaded_by_details', 'uploaded_at')
        read_only_fields = ('uploaded_by', 'uploaded_by_details', 'file_name', 'file_size')
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploaded_by'] = user
        
        # Set file name and size
        file = validated_data['file']
        validated_data['file_name'] = file.name
        validated_data['file_size'] = file.size
        
        return super().create(validated_data)

# Serializers for creating/updating
class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'description', 'start_date', 'end_date', 'status', 'team']
    
    def create(self, validated_data):
        # Add the current user as created_by
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ('project', 'title', 'description', 'status', 'priority', 'start_date', 'end_date', 'due_date', 'assignee', 'created_by')
    
    def create(self, validated_data):
        # Add the current user as created_by
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
class SubtaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ('task', 'title', 'description', 'status', 'due_date', 'assignee')

# Add to serializers.py
class SheetColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = SheetColumn
        fields = ('id', 'sheet', 'name', 'key', 'column_type', 'width', 'order', 
                 'is_required', 'options', 'formula', 'settings')

class CellSerializer(serializers.ModelSerializer):
    column_key = serializers.CharField(source='column.key', read_only=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Cell
        fields = ('id', 'row', 'column', 'column_key', 'value', 'raw_value', 
                 'updated_by', 'updated_by_name', 'updated_at')

    def get_updated_by_name(self, obj):
        return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"

class SheetRowSerializer(serializers.ModelSerializer):
    cells = CellSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SheetRow
        fields = ('id', 'sheet', 'order', 'created_by', 'created_by_name', 
                 'created_at', 'updated_at', 'cells')

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"

class ProjectSheetSerializer(serializers.ModelSerializer):
    columns = SheetColumnSerializer(many=True, read_only=True)
    rows = SheetRowSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    row_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjectSheet
        fields = ('id', 'project', 'name', 'description', 'sheet_type', 
                 'created_by', 'created_by_name', 'is_public', 'settings',
                 'columns', 'rows', 'row_count', 'created_at', 'updated_at')

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"

    def get_row_count(self, obj):
        return obj.rows.count()

class SheetViewSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SheetView
        fields = ('id', 'sheet', 'name', 'view_type', 'filters', 'sort_by',
                 'group_by', 'created_by', 'created_by_name', 'is_shared', 'settings')

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"

class SheetCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = SheetComment
        fields = ('id', 'sheet', 'cell', 'user', 'user_name', 'user_avatar',
                 'content', 'resolved', 'created_at', 'updated_at')

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_user_avatar(self, obj):
        return obj.user.avatar.url if obj.user.avatar else None

# Create serializers
class ProjectSheetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectSheet
        fields = ('name', 'description', 'sheet_type', 'project', 'is_public', 'settings')

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class BulkCellUpdateSerializer(serializers.Serializer):
    updates = serializers.ListField(
        child=serializers.DictField()
    )

    def validate_updates(self, value):
        for update in value:
            if 'row_id' not in update or 'column_key' not in update or 'value' not in update:
                raise serializers.ValidationError("Each update must contain row_id, column_key, and value")
        return value