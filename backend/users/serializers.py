# serializers.py - CORRECTED VERSION
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    Notification, User, Team, TeamMember, TeamInvitation, UserProfile, 
    SheetColumn, Cell, SheetRow, ProjectSheet, SheetView, SheetComment,
    Project, ProjectMember, Task, Subtask, TaskComment, TaskAttachment, 
    TeamJoinRequest, ActivityLog, ProjectAssignee, ProjectPermission
)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def validate(self, data):
        email = data.get('email')
        username = data.get('username')
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': ['A user with this email already exists.']
            })
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                'username': ['A user with this username already exists.']
            })
        
        # Check if passwords match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': ['Passwords do not match.']
            })
        
        return data
    
    def create(self, validated_data):
        # Remove password_confirm from validated_data
        validated_data.pop('password_confirm', None)
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        return user

class UserLoginSerializer(serializers.Serializer):
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email_or_username = data.get('email_or_username')
        password = data.get('password')
        
        if not email_or_username or not password:
            raise serializers.ValidationError({
                'email_or_username': 'This field is required.',
                'password': 'This field is required.'
            })
        
        # Use Django's authenticate with our custom backend
        user = authenticate(username=email_or_username, password=password)
        
        if user is None:
            raise serializers.ValidationError('Invalid email/username or password')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')
        
        data['user'] = user
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_verified', 'last_active')

# Team serializers
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

# Invitation serializers
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

# Notification serializers
class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ('id', 'type', 'status', 'title', 'message', 'related_id', 'action_url', 'created_at', 'time_ago')
    
    def get_time_ago(self, obj):
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

# Profile serializers
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('email_notifications', 'push_notifications', 'created_at', 'updated_at')

class UserWithProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_verified', 'last_active', 'profile')

# Project serializers
class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = ProjectMember
        fields = ('id', 'user', 'user_email', 'role', 'joined_at')

class ProjectAssigneeSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    assigned_by_details = UserSerializer(source='assigned_by', read_only=True)
    
    class Meta:
        model = ProjectAssignee
        fields = ('id', 'project', 'user', 'user_details', 'role', 'assigned_by', 
                 'assigned_by_details', 'assigned_at', 'is_lead', 'get_role_display')

class ProjectPermissionSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProjectPermission
        fields = ('id', 'project', 'user', 'user_details', 'level', 'can_edit_name',
                 'can_edit_description', 'can_edit_dates', 'can_edit_status',
                 'can_assign_tasks', 'can_manage_members', 'can_transfer_project',
                 'can_delete_project', 'get_level_display')

class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(source='memberships', many=True, read_only=True)
    assignees = ProjectAssigneeSerializer(source='assignee_relations', many=True, read_only=True)  
    permissions = ProjectPermissionSerializer(many=True, read_only=True)  
    
    # SerializerMethodField allows us to switch between Optimized Data and Fallback Data
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    assignee_count = serializers.SerializerMethodField()
    
    created_by_name = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = Project
        fields = (
            'id', 'team', 'team_name', 'name', 'description', 'start_date', 'end_date',
            'status', 'created_by', 'created_by_name', 'members', 'assignees', 'permissions',  
            'member_count', 'assignee_count', 'task_count', 'created_at', 'updated_at','is_favorite'
        )
        read_only_fields = ('created_by', 'created_by_name', 'members', 'assignees', 
                           'member_count', 'assignee_count', 'task_count', 'permissions')
        
    def get_assignee_count(self, obj):
        # OPTIMIZATION CHECK
        if hasattr(obj, 'active_assignee_count'):
             return obj.active_assignee_count
        
        # FALLBACK (Standard Django ORM)
        # Check if the relation exists to avoid errors on partial objects
        if hasattr(obj, 'assignee_relations'):
            return obj.assignee_relations.count()
        return 0
    
    def get_member_count(self, obj):
        # OPTIMIZATION CHECK
        if hasattr(obj, 'active_member_count'):
            return obj.active_member_count
        # FALLBACK
        if hasattr(obj, 'memberships'):
            return obj.memberships.count()
        return 0

    def get_task_count(self, obj):
        # OPTIMIZATION CHECK
        if hasattr(obj, 'active_task_count'):
            return obj.active_task_count
        # FALLBACK
        if hasattr(obj, 'tasks'):
            return obj.tasks.count()
        return 0
    
    def get_is_favorite(self, obj):
        # OPTIMIZATION CHECK
        if hasattr(obj, 'is_user_favorite'):
            return obj.is_user_favorite
        
        # FALLBACK
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not user.is_anonymous:
            return obj.favorited_by.filter(id=user.id).exists()
        return False
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return "Unknown"

# Project Create Serializer - FIXED (Only ONE create method)
class ProjectCreateSerializer(serializers.ModelSerializer):
    assignee_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
        default=list
    )
    assignee_roles = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=3),
        required=False,
        write_only=True,
        default=list
    )
    
    class Meta:
        model = Project
        fields = ['name', 'description', 'start_date', 'end_date', 'status', 'team', 'assignee_ids', 'assignee_roles']
    
    def validate(self, attrs):
        assignee_ids = attrs.get('assignee_ids', [])
        assignee_roles = attrs.get('assignee_roles', [])
        
        if assignee_ids and assignee_roles and len(assignee_ids) != len(assignee_roles):
            raise serializers.ValidationError({
                'assignee_ids': 'Number of assignee_ids must match number of assignee_roles'
            })
        
        return attrs
    
    def create(self, validated_data):
        assignee_ids = validated_data.pop('assignee_ids', [])
        assignee_roles = validated_data.pop('assignee_roles', [])
        user = self.context['request'].user
        
        # Extract team from validated_data
        team = validated_data.get('team')
        
        # Create the project with created_by
        project = Project.objects.create(
            **validated_data,
            created_by=user
        )
        
        # Track users we've already added to avoid duplicates
        added_user_ids = set()
        
        # Add creator only once
        added_user_ids.add(user.id)
        
        # Create creator's ProjectMember entry
        ProjectMember.objects.get_or_create(
            project=project,
            user=user,
            defaults={'role': ProjectMember.Role.MANAGER}
        )
        
        # Create creator's ProjectAssignee entry
        ProjectAssignee.objects.get_or_create(
            project=project,
            user=user,
            defaults={
                'role': ProjectAssignee.AssigneeRole.LEAD,
                'assigned_by': user,
                'is_lead': True
            }
        )
        
        # Create permission for creator
        ProjectPermission.objects.get_or_create(
            project=project,
            user=user,
            defaults={'level': ProjectPermission.PermissionLevel.ADMIN}
        )
        
        # Add other assignees
        for i, assignee_id in enumerate(assignee_ids):
            if assignee_id in added_user_ids:
                continue  # Skip if already added
                
            try:
                assignee_user = User.objects.get(id=assignee_id)
                role = assignee_roles[i] if i < len(assignee_roles) else 1
                
                # Check if user is a team member
                if not TeamMember.objects.filter(team=team, user=assignee_user, is_active=True).exists():
                    print(f"Skipping {assignee_user.email}: Not a team member")
                    continue
                
                added_user_ids.add(assignee_user.id)
                
                # Add as project member (only if not already)
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=assignee_user,
                    defaults={'role': ProjectMember.Role.CONTRIBUTOR}
                )
                
                # Add as assignee
                ProjectAssignee.objects.get_or_create(
                    project=project,
                    user=assignee_user,
                    defaults={
                        'role': role,
                        'assigned_by': user,
                        'is_lead': (role == 3)
                    }
                )
                
                # Create permission
                permission_level = (
                    ProjectPermission.PermissionLevel.ADMIN if role == 3 else
                    ProjectPermission.PermissionLevel.EDIT_ALL if role == 2 else
                    ProjectPermission.PermissionLevel.EDIT_BASIC
                )
                
                ProjectPermission.objects.get_or_create(
                    project=project,
                    user=assignee_user,
                    defaults={'level': permission_level}
                )
                
            except User.DoesNotExist:
                print(f"User with ID {assignee_id} does not exist")
                continue
        
        return project

# Task serializers
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

class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ('project', 'title', 'description', 'status', 'priority', 'start_date', 'end_date', 'due_date', 'assignee', 'created_by')
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

# Subtask serializers
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

class SubtaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ('task', 'title', 'description', 'status', 'due_date', 'assignee')

# Comment serializers
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

# Attachment serializers
class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)
    
    class Meta:
        model = TaskAttachment
        fields = ('id', 'task', 'file', 'file_name', 'file_size', 'uploaded_by', 'uploaded_by_details', 'uploaded_at')
        read_only_fields = ('uploaded_by', 'uploaded_by_details', 'file_name', 'file_size')
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploaded_by'] = user
        
        file = validated_data['file']
        validated_data['file_name'] = file.name
        validated_data['file_size'] = file.size
        
        return super().create(validated_data)

# Sheet serializers
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

# Team join request serializers
class TeamJoinRequestSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = TeamJoinRequest
        fields = ('id', 'email', 'team', 'team_name', 'user', 'user_details', 'message', 
                 'status', 'created_at', 'processed_by', 'processed_by_name', 'processed_at')
    
    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return f"{obj.processed_by.first_name} {obj.processed_by.last_name}"
        return None

# Team settings serializers
class TeamSettingsSerializer(serializers.ModelSerializer):
    security_settings = serializers.SerializerMethodField()
    feature_settings = serializers.SerializerMethodField()
    permission_settings = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ('id', 'name', 'settings', 'security_settings', 'feature_settings', 'permission_settings')
    
    def get_security_settings(self, obj):
        default_security = obj.default_settings['security']
        current_security = obj.settings.get('security', {})
        return {**default_security, **current_security}
    
    def get_feature_settings(self, obj):
        default_features = obj.default_settings['features']
        current_features = obj.settings.get('features', {})
        return {**default_features, **current_features}
    
    def get_permission_settings(self, obj):
        default_permissions = obj.default_settings['permissions']
        current_permissions = obj.settings.get('permissions', {})
        return {**default_permissions, **current_permissions}
    
    def update(self, instance, validated_data):
        settings_data = validated_data.pop('settings', None)
        
        if settings_data:
            import copy
            current_settings = copy.deepcopy(instance.settings)
            
            def deep_merge(current, update):
                for key, value in update.items():
                    if isinstance(value, dict) and key in current and isinstance(current[key], dict):
                        current[key] = deep_merge(current[key], value)
                    else:
                        current[key] = value
                return current
            
            instance.settings = deep_merge(current_settings, settings_data)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class TeamSettingsUpdateSerializer(serializers.Serializer):
    security = serializers.JSONField(required=False)
    features = serializers.JSONField(required=False)
    permissions = serializers.JSONField(required=False)
    
    def validate_security(self, value):
        allowed_keys = {'allow_public_invites', 'require_approval', 'default_role', 'allow_guest_access'}
        if not all(key in allowed_keys for key in value.keys()):
            raise serializers.ValidationError("Invalid security settings")
        
        if 'default_role' in value and value['default_role'] not in [2, 3, 4]:
            raise serializers.ValidationError("Invalid default role")
        
        return value
    
    def validate_features(self, value):
        allowed_keys = {'enable_team_analytics', 'enable_file_sharing', 'max_file_size', 'enable_team_chat'}
        if not all(key in allowed_keys for key in value.keys()):
            raise serializers.ValidationError("Invalid feature settings")
        
        if 'max_file_size' in value and (value['max_file_size'] < 1 or value['max_file_size'] > 1000):
            raise serializers.ValidationError("Max file size must be between 1 and 1000 MB")
        
        return value
    
    def validate_permissions(self, value):
        allowed_keys = {'members_can_create_projects', 'members_can_invite', 'guests_can_view'}
        if not all(key in allowed_keys for key in value.keys()):
            raise serializers.ValidationError("Invalid permission settings")
        
        return value

# Activity log serializer
class ActivityLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = (
            'id', 'user', 'user_details', 'team', 'team_name', 
            'project', 'project_name', 'action_type', 'description',
            'details', 'created_at', 'time_ago'
        )
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours}h ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes}m ago"
        else:
            return "Just now"