# utils/notifications.py
from django.db.models import Q
from datetime import datetime
from .models import Notification, ActivityLog, TeamMember, User, ProjectMember

def create_activity_log(user, action_type, description, details=None, team=None, project=None):
    """Create an activity log entry"""
    activity = ActivityLog.objects.create(
        user=user,
        team=team,
        project=project,
        action_type=action_type,
        description=description,
        details=details or {}
    )
    return activity

def notify_team_members(team, title, message, related_id=None, action_url=None, sender=None):
    """Send notification to all team members"""
    # Get all active team members
    team_members = TeamMember.objects.filter(team=team, is_active=True).select_related('user')
    
    notifications = []
    for member in team_members:
        # Don't notify the sender if specified
        if sender and member.user == sender:
            continue
            
        notification = Notification(
            user=member.user,
            type=Notification.Type.MESSAGE,  # Or create a new type for team announcements
            title=title,
            message=message,
            related_id=related_id,
            action_url=action_url
        )
        notifications.append(notification)
    
    # Bulk create notifications
    Notification.objects.bulk_create(notifications)
    return notifications

def notify_project_members(project, title, message, related_id=None, action_url=None, sender=None):
    """Send notification to all project members"""
    project_members = ProjectMember.objects.filter(project=project).select_related('user')
    
    notifications = []
    for member in project_members:
        if sender and member.user == sender:
            continue
            
        notification = Notification(
            user=member.user,
            type=Notification.Type.MESSAGE,
            title=title,
            message=message,
            related_id=related_id,
            action_url=action_url
        )
        notifications.append(notification)
    
    Notification.objects.bulk_create(notifications)
    return notifications

def create_project_transfer_notifications(source_team, target_team, project, transferrer):
    """Create notifications for project transfer"""
    details = {
        'project_id': str(project.id),
        'project_name': project.name,
        'source_team_id': str(source_team.id),
        'source_team_name': source_team.name,
        'target_team_id': str(target_team.id),
        'target_team_name': target_team.name,
        'transferrer_id': str(transferrer.id),
        'transferrer_name': f"{transferrer.first_name} {transferrer.last_name}",
        'timestamp': datetime.now().isoformat()
    }
    
    # 1. Create activity log
    create_activity_log(
        user=transferrer,
        action_type=ActivityLog.ActionType.PROJECT_TRANSFERRED,
        description=f"Transferred project '{project.name}' from '{source_team.name}' to '{target_team.name}'",
        details=details,
        team=source_team,  # Log in source team
        project=project
    )
    
    # 2. Create duplicate log in target team
    create_activity_log(
        user=transferrer,
        action_type=ActivityLog.ActionType.PROJECT_TRANSFERRED,
        description=f"Project '{project.name}' transferred from '{source_team.name}'",
        details=details,
        team=target_team,  # Also log in target team
        project=project
    )
    
    # 3. Notify source team members
    notify_team_members(
        team=source_team,
        title="📤 Project Transferred Out",
        message=f"Project '{project.name}' has been transferred to {target_team.name} by {transferrer.first_name} {transferrer.last_name}",
        related_id=project.id,
        action_url=f"/team/{target_team.id}/project/{project.id}",
        sender=transferrer
    )
    
    # 4. Notify target team members
    notify_team_members(
        team=target_team,
        title="📥 Project Transferred In",
        message=f"Project '{project.name}' has been transferred from {source_team.name} by {transferrer.first_name} {transferrer.last_name}",
        related_id=project.id,
        action_url=f"/team/{target_team.id}/project/{project.id}",
        sender=transferrer
    )
    
    # 5. Notify project members (if they're in both teams)
    project_members = ProjectMember.objects.filter(project=project).select_related('user')
    for member in project_members:
        # Check if member is in target team
        in_target_team = TeamMember.objects.filter(
            team=target_team, 
            user=member.user, 
            is_active=True
        ).exists()
        
        if not in_target_team:
            # Member is no longer in the project since they're not in target team
            Notification.objects.create(
                user=member.user,
                type=Notification.Type.MESSAGE,
                title="🚫 Project Access Changed",
                message=f"You've lost access to project '{project.name}' because it was transferred to {target_team.name}",
                related_id=project.id,
                action_url=f"/team/{source_team.id}/projects"
            )
    
    return details