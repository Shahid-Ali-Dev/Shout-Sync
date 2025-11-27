import React, { useState, useEffect, useCallback } from 'react'; // Add useCallback
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  GroupAdd as InvitationIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  CheckCircle as CheckIcon,
  Cancel as XIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'; // Removed EmailIcon
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { notificationAPI } from '../shared/services/notificationAPI';
import { authAPI } from '../shared/services/api';

interface Notification {
  id: string;
  type: number;
  status: number;
  title: string;
  message: string;
  related_id: string | null;
  action_url: string | null;
  created_at: string;
  metadata?: {
    invitation_status?: number;
    invitation_id?: string;
    is_expired?: boolean;
    team_name?: string;
  };
}

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  
  const { isAuthenticated } = useSelector((state: RootState) => state.auth); // Removed unused 'user'

  // Wrap loadNotifications in useCallback to avoid useEffect dependency issues
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      
      // Enhance notifications with current invitation status
      const enhancedNotifications = await Promise.all(
        response.data.map(async (notification: Notification) => {
          if (notification.type === 1 && notification.action_url) {
            const token = notification.action_url.split('/').pop();
            if (token) {
              try {
                const invitationResponse = await authAPI.getInvitationDetails(token);
                return {
                  ...notification,
                  metadata: {
                    invitation_status: invitationResponse.data.status,
                    invitation_id: invitationResponse.data.id,
                    is_expired: new Date(invitationResponse.data.expires_at) < new Date(),
                    team_name: invitationResponse.data.team_name
                  }
                };
              } catch (error) {
                console.error('Failed to get invitation details:', error);
                return {
                  ...notification,
                  metadata: {
                    invitation_status: getStatusFromTitle(notification.title),
                    is_expired: notification.title.includes('Expired'),
                    team_name: extractTeamName(notification.message)
                  }
                };
              }
            }
          }
          return notification;
        })
      );
      
      setNotifications(enhancedNotifications);
      setNotificationsLoaded(true);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add dependencies

  const getStatusFromTitle = (title: string): number => {
    if (title.includes('Accepted')) return 2;
    if (title.includes('Declined')) return 3;
    if (title.includes('Expired')) return 4;
    return 1;
  };

  const extractTeamName = (message: string): string => {
    const match = message.match(/to join (.+)$/) || message.match(/joined (.+)$/);
    return match ? match[1] : 'the team';
  };

  const getNotificationDisplay = (notification: Notification) => {
    return {
      title: notification.title,
      message: notification.message,
      showActions: shouldShowActions(notification),
      icon: getNotificationIcon(notification.title)
    };
  };

  const shouldShowActions = (notification: Notification): boolean => {
    if (notification.type !== 1) return false;
    
    const statusInfo = getInvitationStatus(notification);
    return statusInfo?.label === 'Pending' && !notification.metadata?.is_expired;
  };

  const getNotificationIcon = (title: string) => {
    if (title.includes('🎉') || title.includes('✅') || title.includes('Accepted')) {
      return <CheckIcon color="success" />;
    }
    if (title.includes('❌') || title.includes('Declined')) {
      return <XIcon color="error" />;
    }
    if (title.includes('⏰') || title.includes('Expired')) {
      return <ScheduleIcon color="disabled" />;
    }
    if (title.includes('📨') || title.includes('📤') || title.includes('Invitation')) {
      return <InvitationIcon color="primary" />;
    }
    return <NotificationsIcon />;
  };

  useEffect(() => {
    if (isAuthenticated && !notificationsLoaded) {
      loadNotifications();
    }
  }, [isAuthenticated, notificationsLoaded, loadNotifications]); // Now properly included

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Optionally refresh notifications when opening the panel
    loadNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 2 }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, status: 2 }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleAcceptInvitation = async (token: string, notificationId: string) => {
    try {
      setLoading(true);
      await authAPI.acceptInvitation(token);
      
      // RELOAD FROM SERVER to get the actual updated notification
      await loadNotifications();
      
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      // Still reload to ensure consistency
      await loadNotifications();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (token: string, notificationId: string) => {
    try {
      setLoading(true);
      await authAPI.rejectInvitation(token);
      
      // RELOAD FROM SERVER to get the actual updated notification
      await loadNotifications();
      
    } catch (error: any) {
      console.error('Failed to reject invitation:', error);
      // Still reload to ensure consistency
      await loadNotifications();
    } finally {
      setLoading(false);
    }
  };

  const getInvitationStatus = (notification: Notification) => {
    if (notification.metadata?.invitation_status) {
      const status = notification.metadata.invitation_status;
      switch (status) {
        case 1:
          return { label: 'Pending', color: 'warning' as const, icon: <InvitationIcon /> };
        case 2:
          return { label: 'Accepted', color: 'success' as const, icon: <CheckIcon /> };
        case 3:
          return { label: 'Declined', color: 'error' as const, icon: <XIcon /> };
        case 4:
          return { label: 'Expired', color: 'default' as const, icon: <ScheduleIcon /> };
        default:
          return null;
      }
    }
    
    if (notification.title.includes('Accepted') || notification.title.includes('🎉') || notification.title.includes('✅')) {
      return { label: 'Accepted', color: 'success' as const, icon: <CheckIcon /> };
    }
    if (notification.title.includes('Declined') || notification.title.includes('❌')) {
      return { label: 'Declined', color: 'error' as const, icon: <XIcon /> };
    }
    if (notification.title.includes('Expired') || notification.title.includes('⏰')) {
      return { label: 'Expired', color: 'default' as const, icon: <ScheduleIcon /> };
    }
    if (notification.title.includes('Sent') || notification.title.includes('Invitation')) {
      return { label: 'Pending', color: 'warning' as const, icon: <InvitationIcon /> };
    }
    
    return { label: 'Pending', color: 'warning' as const, icon: <InvitationIcon /> };
  };

  const getNotificationAction = (notification: Notification, displayInfo: any) => {
    if (notification.type === 1 && notification.action_url && displayInfo.showActions) {
      const statusInfo = getInvitationStatus(notification);
      const token = notification.action_url.split('/').pop();
      
      if (!token) return null;
      
      if (statusInfo && statusInfo.label !== 'Pending') {
        return (
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={statusInfo.icon}
              label={statusInfo.label}
              color={statusInfo.color}
              size="small"
              variant="outlined"
            />
          </Box>
        );
      }
      
      if (notification.metadata?.is_expired) {
        return (
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={<ScheduleIcon />}
              label="Expired"
              color="default"
              size="small"
              variant="outlined"
            />
          </Box>
        );
      }
      
      return (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AcceptIcon />}
            onClick={() => handleAcceptInvitation(token, notification.id)}
            disabled={loading}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<RejectIcon />}
            onClick={() => handleRejectInvitation(token, notification.id)}
            disabled={loading}
          >
            Decline
          </Button>
        </Box>
      );
    }
    return null;
  };

  const unreadCount = notifications.filter(n => n.status === 1).length;
  const open = Boolean(anchorEl);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead} disabled={loading}>
                Mark all as read
              </Button>
            )}
          </Box>

          <Divider />

          {loading && !notificationsLoaded ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Loading notifications...</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="textSecondary">No notifications</Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification) => {
                const displayInfo = getNotificationDisplay(notification);
                const notificationAction = getNotificationAction(notification, displayInfo);
                
                return (
                  <ListItem
                    key={notification.id}
                    sx={{
                      backgroundColor: notification.status === 1 ? 'action.hover' : 'transparent',
                      borderLeft: notification.status === 1 ? '4px solid' : '4px solid transparent',
                      borderLeftColor: 'primary.main',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 2,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                      <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                        {displayInfo.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" component="div">
                            {displayInfo.title}
                            {notification.status === 1 && (
                              <Box 
                                component="span" 
                                sx={{ 
                                  display: 'inline-block',
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: 'primary.main',
                                  ml: 1,
                                  verticalAlign: 'middle'
                                }} 
                              />
                            )}
                          </Typography>
                        }
                        secondary={
                          <Box component="div">
                            <Typography variant="body2" color="textSecondary" component="div">
                              {displayInfo.message}
                            </Typography>
                            {notificationAction}
                            <Typography variant="caption" color="textSecondary" component="div" sx={{ mt: 1, display: 'block' }}>
                              {new Date(notification.created_at).toLocaleDateString()} at{' '}
                              {new Date(notification.created_at).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;