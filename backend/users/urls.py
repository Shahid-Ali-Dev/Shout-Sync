from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    
    # Teams (updated from Organizations)
    path('teams/', views.teams_view, name='teams'),
    path('teams/<uuid:team_id>/', views.team_detail_view, name='team-detail'),
    path('teams/<uuid:team_id>/members/', views.team_members_view, name='team-members'),
    path('teams/<uuid:team_id>/invite/', views.invite_member_view, name='invite-member'),
    path('teams/<uuid:team_id>/leave/', views.leave_team_view, name='leave-team'),
    path('teams/<uuid:team_id>/members/<uuid:member_id>/remove/', views.remove_member_view, name='remove-member'),
    
    # Invitations
    path('invitations/pending/', views.pending_invitations_view, name='pending-invitations'),
    path('invitations/<str:token>/accept/', views.accept_invitation_view, name='accept-invitation'),
    path('invitations/<str:token>/reject/', views.reject_invitation_view, name='reject-invitation'),

    # Member management
    path('teams/<uuid:team_id>/members/<uuid:member_id>/update-role/', views.update_member_role_view, name='update-member-role'),
    path('teams/<uuid:team_id>/members/<uuid:member_id>/transfer-ownership/', views.transfer_ownership_view, name='transfer-ownership'),
    path('teams/<uuid:team_id>/delete/', views.delete_team_view, name='delete-team'),
    path('invitations/public/<str:token>/', views.invitation_details_view, name='invitation-details'),
    path('invitations/public/<str:token>/accept/', views.accept_invitation_public_view, name='accept-invitation-public'),
    path('invitations/public/<str:token>/reject/', views.reject_invitation_public_view, name='reject-invitation-public'),
    
    # Notifications
    path('notifications/', views.notifications_view, name='notifications'),
    path('notifications/<uuid:notification_id>/read/', views.mark_notification_read_view, name='mark-notification-read'),
    path('notifications/read-all/', views.mark_all_notifications_read_view, name='mark-all-notifications-read'),
    path('notifications/<uuid:notification_id>/', views.delete_notification_view, name='delete-notification'),
    path('invitations/check-pending/', views.check_pending_invitations_view, name='check-pending-invitations'),
    path('invitations/accept-pending/', views.accept_pending_invitations_view, name='accept-pending-invitations'),

    # Project URLs
    path('teams/<uuid:team_id>/projects/', views.projects_view, name='projects'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/', views.project_detail_view, name='project-detail'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/members/', views.project_members_view, name='project-members'),
    
    # Task URLs
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/tasks/', views.tasks_view, name='tasks'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/tasks/<uuid:task_id>/', views.task_detail_view, name='task-detail'),
    
    # Subtask URLs
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/tasks/<uuid:task_id>/subtasks/', views.subtasks_view, name='subtasks'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/tasks/<uuid:task_id>/subtasks/<uuid:subtask_id>/', views.subtask_detail_view, name='subtask-detail'),
    
    # Task Comments
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/tasks/<uuid:task_id>/comments/', views.task_comments_view, name='task-comments'),

    path('teams/<uuid:team_id>/join-request/', views.request_to_join_team_view, name='request-to-join-team'),
    path('teams/<uuid:team_id>/join-requests/', views.team_join_requests_view, name='team-join-requests'),
    path('teams/<uuid:team_id>/join-requests/<uuid:request_id>/approve/', views.approve_join_request_view, name='approve-join-request'),
    path('teams/<uuid:team_id>/join-requests/<uuid:request_id>/reject/', views.reject_join_request_view, name='reject-join-request'),

    path('teams/<uuid:team_id>/settings/', views.team_settings_view, name='team-settings'),
    path('teams/<uuid:team_id>/settings/update/', views.update_team_setting_view, name='update-team-setting'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/transfer/', views.transfer_project_view, name='transfer-project'),
    path('teams/<uuid:team_id>/activity/', views.team_activity_view, name='team-activity'),
    path('teams/<uuid:team_id>/projects/<uuid:project_id>/activity/', views.project_activity_view, name='project-activity'),
    path('teams/<uuid:team_id>/activity/recent/', views.recent_activity_view, name='recent-activity'),

    path('teams/<uuid:team_id>/members/optimized/', views.team_members_optimized_view, name='team-members-optimized'),
    path('teams/<uuid:team_id>/members/search/', views.search_team_members_view, name='search-team-members'),
    path('teams/<uuid:team_id>/projects/create-optimized/', views.create_project_optimized, name='create-project-optimized'),
]