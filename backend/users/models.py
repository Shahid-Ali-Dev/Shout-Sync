
#models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# User model (keep your existing User model, just remove the circular imports)
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)  # Make optional
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Empty since username is not required

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Auto-generate username from email if not provided
        if not self.username:
            # Generate a unique username from email
            base_username = self.email.split('@')[0]
            username = base_username
            counter = 1
            
            # Import here to avoid circular import
            from django.apps import apps
            User = apps.get_model('users', 'User')
            
            # Check if username already exists
            while User.objects.filter(username=username).exclude(pk=self.pk).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            self.username = username
        super().save(*args, **kwargs)

class Notification(models.Model):
    class Type(models.IntegerChoices):
        INVITATION = 1, 'Team Invitation'
        MENTION = 2, 'Mention'
        TASK_ASSIGNED = 3, 'Task Assigned'
        MESSAGE = 4, 'New Message'
        JOIN_REQUEST = 5, 'Join Request'
    
    class Status(models.IntegerChoices):
        UNREAD = 1, 'Unread'
        READ = 2, 'Read'
        DISMISSED = 3, 'Dismissed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='notifications')
    type = models.IntegerField(choices=Type.choices)
    status = models.IntegerField(choices=Status.choices, default=Status.UNREAD)
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_id = models.UUIDField(null=True, blank=True)
    action_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    def update_for_invitation_status(self, invitation, is_for_inviter=False):
        """Update notification based on invitation status"""
        if is_for_inviter:
            if invitation.status == TeamInvitation.Status.ACCEPTED:
                self.title = "Invitation Accepted"
                self.message = f"{invitation.email} accepted your invitation to join {invitation.team.name}"
                self.status = self.Status.READ
            elif invitation.status == TeamInvitation.Status.REJECTED:
                self.title = "Invitation Declined" 
                self.message = f"{invitation.email} declined your invitation to join {invitation.team.name}"
                self.status = self.Status.READ
            elif invitation.status == TeamInvitation.Status.EXPIRED:
                self.title = "Invitation Expired"
                self.message = f"Your invitation to {invitation.email} for {invitation.team.name} has expired"
                self.status = self.Status.READ
        else:
            if invitation.status == TeamInvitation.Status.ACCEPTED:
                self.title = "🎉 Invitation Accepted"
                self.message = f"You've successfully joined {invitation.team.name}"
                self.status = self.Status.READ
            elif invitation.status == TeamInvitation.Status.REJECTED:
                self.title = "❌ Invitation Declined" 
                self.message = f"You've declined the invitation to join {invitation.team.name}"
                self.status = self.Status.READ
            elif invitation.status == TeamInvitation.Status.EXPIRED:
                self.title = "⏰ Invitation Expired"
                self.message = f"The invitation to join {invitation.team.name} has expired"
                self.status = self.Status.READ
        
        self.save()
        return self

class UserProfile(models.Model):
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='profile')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile - {self.user.email}"

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to='team_logos/', blank=True, null=True)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_teams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add settings fields
    settings = models.JSONField(default=dict, blank=True)  # Store all settings as JSON
    
    def __str__(self):
        return self.name

    @property
    def default_settings(self):
        """Return default settings structure"""
        return {
            'security': {
                'allow_public_invites': False,
                'require_approval': True,
                'default_role': 3,  # Member
                'allow_guest_access': False,
            },
            'features': {
                'enable_team_analytics': True,
                'enable_file_sharing': True,
                'max_file_size': 100,  # MB
                'enable_team_chat': True,
            },
            'permissions': {
                'members_can_create_projects': False,
                'members_can_invite': False,
                'guests_can_view': True,
            }
        }

    def get_setting(self, path, default=None):
        """Get a specific setting value using dot notation"""
        keys = path.split('.')
        value = self.settings
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        return value

    def update_setting(self, path, value):
        """Update a specific setting using dot notation"""
        keys = path.split('.')
        settings = self.settings.copy()
        current = settings
        
        # Navigate to the parent of the final key
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Set the final value
        current[keys[-1]] = value
        self.settings = settings
        self.save()

class TeamMember(models.Model):
    class Role(models.IntegerChoices):
        OWNER = 1, 'Owner'
        ADMIN = 2, 'Admin'
        MEMBER = 3, 'Member'
        GUEST = 4, 'Guest'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='team_memberships')
    team = models.ForeignKey('Team', on_delete=models.CASCADE, related_name='members')
    role = models.IntegerField(choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['user', 'team']

    def __str__(self):
        return f"{self.user.email} - {self.team.name}"

class TeamInvitation(models.Model):
    class Status(models.IntegerChoices):
        PENDING = 1, 'Pending'
        ACCEPTED = 2, 'Accepted'
        REJECTED = 3, 'Rejected'
        EXPIRED = 4, 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    team = models.ForeignKey('Team', on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='sent_invitations')
    token = models.CharField(max_length=100, unique=True)
    role = models.IntegerField(choices=TeamMember.Role.choices, default=TeamMember.Role.MEMBER)
    status = models.IntegerField(choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.email} - {self.team.name}"

class Project(models.Model):
    class Status(models.IntegerChoices):
        PLANNING = 1, 'Planning'
        ACTIVE = 2, 'Active'
        ON_HOLD = 3, 'On Hold'
        COMPLETED = 4, 'Completed'
        CANCELLED = 5, 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey('Team', on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.IntegerField(choices=Status.choices, default=Status.PLANNING)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_projects')
    assignees = models.ManyToManyField(
        'User', 
        through='ProjectAssignee', 
        related_name='assigned_projects',
        through_fields=('project', 'user')  
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    favorited_by = models.ManyToManyField(
        'User', 
        related_name='favorite_projects', 
        blank=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.team.name}"
    
class ProjectAssignee(models.Model):
    """Intermediate model for project assignees with role"""
    class AssigneeRole(models.IntegerChoices):
        CONTRIBUTOR = 1, 'Contributor'
        MANAGER = 2, 'Manager'
        LEAD = 3, 'Lead'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='assignee_relations')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='project_assignee_relations')
    role = models.IntegerField(choices=AssigneeRole.choices, default=AssigneeRole.CONTRIBUTOR)
    assigned_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='assigned_project_members')
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_lead = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['project', 'user']
    
    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.get_role_display()})"

class ProjectMember(models.Model):
    class Role(models.IntegerChoices):
        VIEWER = 1, 'Viewer'
        CONTRIBUTOR = 2, 'Contributor'
        MANAGER = 3, 'Manager'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='project_memberships')
    role = models.IntegerField(choices=Role.choices, default=Role.CONTRIBUTOR)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'user']

    def __str__(self):
        return f"{self.user.email} - {self.project.name}"

class Task(models.Model):
    class Status(models.IntegerChoices):
        BACKLOG = 1, 'Backlog'
        TODO = 2, 'To Do'
        IN_PROGRESS = 3, 'In Progress'
        IN_REVIEW = 4, 'In Review'
        DONE = 5, 'Done'

    class Priority(models.IntegerChoices):
        LOW = 1, 'Low'
        MEDIUM = 2, 'Medium'
        HIGH = 3, 'High'
        URGENT = 4, 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.BACKLOG)
    priority = models.IntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    start_date = models.DateTimeField(null=True, blank=True)  
    end_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    assignee = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.project.name}"

    def save(self, *args, **kwargs):
        # Auto-set completed_at when status is changed to DONE
        if self.status == Task.Status.DONE and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        elif self.status != Task.Status.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

class Subtask(models.Model):
    class Status(models.IntegerChoices):
        PENDING = 1, 'Pending'
        IN_PROGRESS = 2, 'In Progress'
        COMPLETED = 3, 'Completed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.PENDING)
    due_date = models.DateTimeField(null=True, blank=True)
    assignee = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_subtasks')
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_subtasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} - {self.task.title}"

class TaskComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='task_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.email} on {self.task.title}"

class TaskAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='task_attachments/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='uploaded_attachments')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} - {self.task.title}"
    
# Add to models.py
class ProjectSheet(models.Model):
    class SheetType(models.IntegerChoices):
        SPREADSHEET = 1, 'Spreadsheet'
        KANBAN = 2, 'Kanban Board'
        TABLE = 3, 'Data Table'
        FORM = 4, 'Form'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='sheets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sheet_type = models.IntegerField(choices=SheetType.choices, default=SheetType.SPREADSHEET)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_sheets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)
    settings = models.JSONField(default=dict, blank=True)  # For custom settings

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.project.name}"

class SheetColumn(models.Model):
    class ColumnType(models.IntegerChoices):
        TEXT = 1, 'Text'
        NUMBER = 2, 'Number'
        DATE = 3, 'Date'
        SELECT = 4, 'Dropdown'
        CHECKBOX = 5, 'Checkbox'
        FORMULA = 6, 'Formula'
        USER = 7, 'User'
        STATUS = 8, 'Status'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sheet = models.ForeignKey('ProjectSheet', on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=50)  # Unique identifier for the column
    column_type = models.IntegerField(choices=ColumnType.choices, default=ColumnType.TEXT)
    width = models.IntegerField(default=150)
    order = models.IntegerField(default=0)
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)  # For dropdown options
    formula = models.TextField(blank=True, null=True)  # For formula columns
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order']
        unique_together = ['sheet', 'key']

    def __str__(self):
        return f"{self.name} - {self.sheet.name}"

class SheetRow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sheet = models.ForeignKey('ProjectSheet', on_delete=models.CASCADE, related_name='rows')
    order = models.IntegerField(default=0)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_rows')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

class Cell(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    row = models.ForeignKey('SheetRow', on_delete=models.CASCADE, related_name='cells')
    column = models.ForeignKey('SheetColumn', on_delete=models.CASCADE, related_name='cells')
    value = models.TextField(blank=True, null=True)
    raw_value = models.JSONField(blank=True, null=True)  # For structured data
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='updated_cells')

    class Meta:
        unique_together = ['row', 'column']

    def __str__(self):
        return f"{self.column.name}: {self.value}"

class SheetView(models.Model):
    class ViewType(models.IntegerChoices):
        GRID = 1, 'Grid'
        KANBAN = 2, 'Kanban'
        CALENDAR = 3, 'Calendar'
        GALLERY = 4, 'Gallery'
        FORM = 5, 'Form'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sheet = models.ForeignKey('ProjectSheet', on_delete=models.CASCADE, related_name='views')
    name = models.CharField(max_length=255)
    view_type = models.IntegerField(choices=ViewType.choices, default=ViewType.GRID)
    filters = models.JSONField(default=dict, blank=True)
    sort_by = models.JSONField(default=dict, blank=True)
    group_by = models.CharField(max_length=50, blank=True, null=True)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE)
    is_shared = models.BooleanField(default=False)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['name']

class SheetComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sheet = models.ForeignKey('ProjectSheet', on_delete=models.CASCADE, related_name='comments')
    cell = models.ForeignKey('Cell', on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='sheet_comments')
    content = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class TeamJoinRequest(models.Model):
    class Status(models.IntegerChoices):
        PENDING = 1, 'Pending'
        APPROVED = 2, 'Approved'
        REJECTED = 3, 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    team = models.ForeignKey('Team', on_delete=models.CASCADE, related_name='join_requests')
    user = models.ForeignKey('User', on_delete=models.CASCADE, null=True, blank=True, related_name='join_requests')
    message = models.TextField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_join_requests')
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.email} - {self.team.name}"
    
# models.py - Add these models
class UserActivity(models.Model):
    class ActivityType(models.IntegerChoices):
        TASK_CREATED = 1, 'Task Created'
        TASK_COMPLETED = 2, 'Task Completed'
        PROJECT_CREATED = 3, 'Project Created'
        TEAM_JOINED = 4, 'Team Joined'
        COMMENT_ADDED = 5, 'Comment Added'
        FILE_UPLOADED = 6, 'File Uploaded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='activities')
    type = models.IntegerField(choices=ActivityType.choices)
    action = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)
    entity_id = models.UUIDField(null=True, blank=True)
    entity_type = models.CharField(max_length=50, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_type_display()}"

class UserProductivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='productivity_metrics')
    date = models.DateField()
    tasks_completed = models.IntegerField(default=0)
    tasks_created = models.IntegerField(default=0)
    time_spent = models.IntegerField(default=0)  # in minutes
    productivity_score = models.FloatField(default=0.0)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']

class ProjectTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, default='General')
    template_data = models.JSONField(default=dict)  # Pre-configured projects/tasks
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey('User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ActivityLog(models.Model):
    class ActionType(models.IntegerChoices):
        PROJECT_CREATED = 1, 'Project Created'  # ADD THIS FIRST
        PROJECT_TRANSFERRED = 2, 'Project Transferred'
        PROJECT_UPDATED = 3, 'Project Updated'
        PROJECT_DELETED = 4, 'Project Deleted'
        TASK_CREATED = 5, 'Task Created'
        TASK_UPDATED = 6, 'Task Updated'
        TASK_DELETED = 7, 'Task Deleted'
        TEAM_JOINED = 8, 'Team Joined'
        MEMBER_ADDED = 9, 'Member Added'
        MEMBER_REMOVED = 10, 'Member Removed'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='activity_logs')
    team = models.ForeignKey('Team', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    action_type = models.IntegerField(choices=ActionType.choices)
    description = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.get_action_type_display()} - {self.created_at}"

# Add to models.py, after ProjectMember model
class ProjectPermission(models.Model):
    """Fine-grained permissions for project access and editing"""
    class PermissionLevel(models.IntegerChoices):
        VIEW_ONLY = 1, 'View Only'
        EDIT_BASIC = 2, 'Edit Basic Info'
        EDIT_ALL = 3, 'Edit All'
        ADMIN = 4, 'Admin'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='permissions')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='project_permissions')
    level = models.IntegerField(choices=PermissionLevel.choices, default=PermissionLevel.VIEW_ONLY)
    can_edit_name = models.BooleanField(default=False)
    can_edit_description = models.BooleanField(default=False)
    can_edit_dates = models.BooleanField(default=False)
    can_edit_status = models.BooleanField(default=False)
    can_assign_tasks = models.BooleanField(default=False)
    can_manage_members = models.BooleanField(default=False)
    can_transfer_project = models.BooleanField(default=False)
    can_delete_project = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['project', 'user']
    
    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.get_level_display()})"

    def save(self, *args, **kwargs):
        # Auto-set permissions based on level
        if self.level == self.PermissionLevel.VIEW_ONLY:
            self.can_edit_name = False
            self.can_edit_description = False
            self.can_edit_dates = False
            self.can_edit_status = False
            self.can_assign_tasks = False
            self.can_manage_members = False
            self.can_transfer_project = False
            self.can_delete_project = False
        elif self.level == self.PermissionLevel.EDIT_BASIC:
            self.can_edit_name = True
            self.can_edit_description = True
            self.can_edit_dates = True
            self.can_edit_status = True
            self.can_assign_tasks = True
            self.can_manage_members = False
            self.can_transfer_project = False
            self.can_delete_project = False
        elif self.level == self.PermissionLevel.EDIT_ALL:
            self.can_edit_name = True
            self.can_edit_description = True
            self.can_edit_dates = True
            self.can_edit_status = True
            self.can_assign_tasks = True
            self.can_manage_members = True
            self.can_transfer_project = False
            self.can_delete_project = False
        elif self.level == self.PermissionLevel.ADMIN:
            self.can_edit_name = True
            self.can_edit_description = True
            self.can_edit_dates = True
            self.can_edit_status = True
            self.can_assign_tasks = True
            self.can_manage_members = True
            self.can_transfer_project = True
            self.can_delete_project = True
        
        super().save(*args, **kwargs)