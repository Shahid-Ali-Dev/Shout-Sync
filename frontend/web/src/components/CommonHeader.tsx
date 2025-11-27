import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
  CheckCircle as AcceptIcon,
  Cancel as DeclineIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../shared/store/store';
import { logout } from '../shared/store/slices/authSlice';
import { notificationAPI } from '../shared/services/notificationAPI';
import { authAPI } from '../shared/services/api';

interface CommonHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backButtonPath?: string;
  onMenuClick?: () => void;
  onBackClick?: () => void; 
  customActions?: React.ReactNode;
  userActions?: React.ReactNode;
  showUserInfo?: boolean;
  variant?: 'default' | 'dashboard' | 'page';
  sx?: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: number;
  status: number;
  created_at: string;
  action_url?: string;
  related_id?: string;
  metadata?: any;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ 
  title, 
  subtitle, 
  showBackButton = false,
  backButtonPath,
  onMenuClick,
   onBackClick,
  customActions,
  userActions,
  showUserInfo = true,
  variant = 'default',
  sx = {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [notificationsAnchor, setNotificationsAnchor] = React.useState<null | HTMLElement>(null);
  const [mainMenuAnchor, setMainMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [processingNotifications, setProcessingNotifications] = React.useState<Set<string>>(new Set());
  const [processedInvitations, setProcessedInvitations] = React.useState<Set<string>>(new Set());
  const [declineConfirmDialog, setDeclineConfirmDialog] = React.useState<{
    open: boolean;
    notification: Notification | null;
  }>({
    open: false,
    notification: null,
  });

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  React.useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Navigation Handlers
  const handleBackClick = () => {
    if (backButtonPath) {
      navigate(backButtonPath);
    } else {
      navigate(-1);
    }
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  // Notification Handlers
  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationsAnchor(null);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Check if notification is for current user
  const isInvitationForCurrentUser = (notification: Notification): boolean => {
    if (!user?.email) return false;
    
    const userEmail = user.email.toLowerCase();
    const message = notification.message?.toLowerCase() || '';
    const title = notification.title?.toLowerCase() || '';
    
    // If it's clearly an invitation sent BY the current user, it's not for them
    if (message.includes('you invited') || message.includes('you sent') || 
        title.includes('invitation sent')) {
      return false;
    }
    
    // If it mentions the current user's email specifically, it's for them
    if (userEmail && message.includes(userEmail)) {
      return true;
    }
    
    // Common patterns for invitations TO the current user
    const toUserPatterns = [
      'invited you',
      'you to join',
      'join the team',
      'team invitation',
      'you have been invited',
      'invitation for you'
    ];
    
    return toUserPatterns.some(pattern => 
      message.includes(pattern) || title.includes(pattern)
    );
  };

  // Check if notification is a pending invitation
  const isPendingInvitation = (notification: Notification): boolean => {
    return !!(
      notification.type === 1 && // INVITATION type
      notification.status === 1 && // UNREAD status
      !processedInvitations.has(notification.id) && // Not locally processed
      notification.related_id && // Has invitation ID
      !notification.title?.includes('Accepted') && // Not already accepted
      !notification.title?.includes('Declined') && // Not already declined
      isInvitationForCurrentUser(notification) // Only for current user
    );
  };

  // Handle invitation actions
  const handleInvitationAction = async (notification: Notification, action: 'accept' | 'reject') => {
    // For reject action, open confirmation dialog instead of immediate action
    if (action === 'reject') {
      setDeclineConfirmDialog({
        open: true,
        notification: notification
      });
      return;
    }

    // For accept action, proceed immediately
    await processInvitationAction(notification, 'accept');
  };

  // Process invitation action
  const processInvitationAction = async (notification: Notification, action: 'accept' | 'reject') => {
    // Get the invitation token from the notification's action_url or related_id
    let invitationToken = '';
    
    // Try to extract token from action_url first
    if (notification.action_url) {
      const tokenMatch = notification.action_url.match(/\/invitation\/accept\/([^/]+)/);
      if (tokenMatch && tokenMatch[1]) {
        invitationToken = tokenMatch[1];
      }
    }
    
    // If no token found in action_url, try to use related_id as token
    if (!invitationToken && notification.related_id) {
      invitationToken = notification.related_id;
    }

    if (!invitationToken) {
      console.error('No invitation token found in notification:', notification);
      return;
    }

    // Check if already processed
    if (processedInvitations.has(notification.id)) {
      return;
    }

    try {
      // Add to processing set
      setProcessingNotifications(prev => new Set(prev).add(notification.id));
      
      console.log(`Processing ${action} for token:`, invitationToken);
      
      if (action === 'accept') {
        await authAPI.acceptInvitation(invitationToken);
      } else {
        await authAPI.rejectInvitation(invitationToken);
      }
      
      // Mark as processed locally
      setProcessedInvitations(prev => new Set(prev).add(notification.id));
      
      // Mark notification as read on server
      await handleMarkAsRead(notification.id);
      
      // Reload notifications to get updated status from server
      setTimeout(() => {
        loadNotifications();
      }, 500);
      
    } catch (error: any) {
      console.error(`Failed to ${action} invitation:`, error);
      console.error('Error details:', error.response?.data);
      
      // Remove from processing on error
      setProcessingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    } finally {
      // Remove from processing after a delay to show loading state
      setTimeout(() => {
        setProcessingNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notification.id);
          return newSet;
        });
      }, 1000);
    }
  };

  // Handle confirmation dialog actions
  const handleDeclineConfirm = async () => {
    if (declineConfirmDialog.notification) {
      await processInvitationAction(declineConfirmDialog.notification, 'reject');
    }
    setDeclineConfirmDialog({ open: false, notification: null });
  };

  const handleDeclineCancel = () => {
    setDeclineConfirmDialog({ open: false, notification: null });
  };

  const handleNotificationAction = (notification: Notification) => {
    if (notification.action_url && !isPendingInvitation(notification)) {
      navigate(notification.action_url);
    }
    if (!isPendingInvitation(notification)) {
      handleMarkAsRead(notification.id);
    }
    handleNotificationClose();
  };

  // Main Menu Handlers
  const handleMainMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMainMenuAnchor(event.currentTarget);
  };

  const handleMainMenuClose = () => {
    setMainMenuAnchor(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleMainMenuClose();
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    handleMainMenuClose();
  };

  const unreadNotifications = notifications.filter(n => n.status === 1);

  // Get header styles based on variant
  const getHeaderStyles = () => {
    switch (variant) {
      case 'dashboard':
        return {
          backgroundColor: 'transparent',
          color: 'text.primary',
          boxShadow: 'none',
        };
      case 'page':
        return {
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        };
      default:
        return {
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        };
    }
  };

  // Notification menu content
  const renderNotificationContent = () => {
    if (notifications.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ 
        maxHeight: isMobile ? '50vh' : 400, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.divider,
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: theme.palette.text.secondary,
        }
      }}>
        {notifications.slice(0, 8).map((notification) => {
          const isPending = isPendingInvitation(notification);
          const isProcessing = processingNotifications.has(notification.id);
          const isProcessed = processedInvitations.has(notification.id);
          const isInvitation = notification.type === 1;

          return (
            <MenuItem 
              key={notification.id}
              onClick={() => !isPending && handleNotificationAction(notification)}
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                backgroundColor: notification.status === 1 ? 'action.hover' : 'transparent',
                flexDirection: 'column',
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                py: 2,
                px: 2,
                opacity: isProcessed ? 0.7 : 1,
                '&:last-child': {
                  borderBottom: 'none'
                }
              }}
            >
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight={notification.status === 1 ? 600 : 400}
                  sx={{ flex: 1, pr: 1 }}
                >
                  {notification.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {notification.status === 1 && !isProcessed && (
                    <Chip 
                      label="New" 
                      size="small" 
                      color="primary" 
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {isProcessing && (
                    <CircularProgress size={16} />
                  )}
                  {isProcessed && (
                    <CheckIcon color="success" fontSize="small" />
                  )}
                </Box>
              </Box>
              
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ mt: 0.5, mb: 1, width: '100%' }}
              >
                {notification.message}
              </Typography>
              
              {/* Show action buttons only for pending invitations */}
              {isPending && !isProcessing && !isProcessed && (
                <Box sx={{ display: 'flex', gap: 1, width: '100%', mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<AcceptIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInvitationAction(notification, 'accept');
                    }}
                    disabled={isProcessing}
                    sx={{ 
                      borderRadius: 1,
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      px: 1.5,
                      py: 0.5,
                      flex: 1
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeclineIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInvitationAction(notification, 'reject');
                    }}
                    disabled={isProcessing}
                    sx={{ 
                      borderRadius: 1,
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      px: 1.5,
                      py: 0.5,
                      flex: 1
                    }}
                  >
                    Decline
                  </Button>
                </Box>
              )}

              {/* Show status for processed invitations */}
              {isInvitation && (isProcessing || isProcessed) && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Chip
                    icon={isProcessing ? <CircularProgress size={16} /> : <CheckIcon />}
                    label={isProcessing ? 'Processing...' : 'Action completed'}
                    size="small"
                    color={isProcessing ? 'default' : 'success'}
                    variant="outlined"
                    sx={{ width: '100%', justifyContent: 'center' }}
                  />
                </Box>
              )}
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                {new Date(notification.created_at).toLocaleDateString()} • {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </MenuItem>
          );
        })}
      </Box>
    );
  };

  // Decline Confirmation Dialog Component
  const DeclineConfirmationDialog = () => (
    <Dialog 
      open={declineConfirmDialog.open} 
      onClose={handleDeclineCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: 'warning.main',
        color: 'white',
        fontWeight: 600,
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeclineIcon />
          Decline Invitation
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          This action cannot be undone. Once you decline, you'll need to be invited again to join this team.
        </Alert>
        
        <Typography variant="body1">
          Are you sure you want to decline this team invitation?
        </Typography>
        
        {declineConfirmDialog.notification && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: 'grey.50', 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {declineConfirmDialog.notification.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {declineConfirmDialog.notification.message}
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleDeclineCancel}
          sx={{ 
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleDeclineConfirm}
          variant="contained"
          color="warning"
          startIcon={<DeclineIcon />}
          sx={{ 
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Yes, Decline Invitation
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Mobile Header (App Bar)
  if (isMobile) {
    return (
      <>
        <AppBar 
          position="fixed"
          sx={{ 
            ...getHeaderStyles(),
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ 
            justifyContent: 'space-between', 
            minHeight: '64px !important',
            px: { xs: 2, sm: 3 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showBackButton && (
                <IconButton 
                  onClick={handleBackClick}
                  edge="start"
                  sx={{ mr: 1 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              )}
              {onMenuClick && (
                <IconButton 
                  onClick={onMenuClick}
                  edge="start"
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    background: title ? 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)' : 'none',
                    backgroundClip: title ? 'text' : 'none',
                    WebkitBackgroundClip: title ? 'text' : 'none',
                    color: title ? 'transparent' : 'text.primary',
                    lineHeight: 1.2
                  }}
                >
                  {title || 'Shout Sync'}
                </Typography>
                {subtitle && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary',
                      lineHeight: 1
                    }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Custom Actions */}
              {customActions}
              
              {/* Notifications Bell */}
              <IconButton 
                onClick={handleNotificationClick}
                size="small"
              >
                <Badge badgeContent={unreadNotifications.length} color="error">
                  <NotificationIcon />
                </Badge>
              </IconButton>

              {/* User Menu */}
              {showUserInfo ? (
                <IconButton 
                  onClick={handleMainMenuClick}
                  size="small"
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem'
                    }}
                  >
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </Avatar>
                </IconButton>
              ) : (
                <IconButton 
                  onClick={handleMainMenuClick}
                  size="small"
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Spacer to push content below fixed AppBar */}
        <Toolbar />

        {/* Mobile Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={handleNotificationClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { 
              width: '92vw',
              maxWidth: 420,
              maxHeight: '75vh',
              borderRadius: 3,
              mt: 1,
              mx: 2,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }
          }}
          disableScrollLock={false}
        >
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            flexShrink: 0 
          }}>
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
          </Box>
          
          {renderNotificationContent()}
          
          {notifications.length > 0 && (
            <Box sx={{ 
              p: 1, 
              borderTop: 1, 
              borderColor: 'divider',
              flexShrink: 0 
            }}>
              <Button 
                fullWidth 
                onClick={handleNotificationClose}
                sx={{ borderRadius: 2 }}
              >
                View All Notifications
              </Button>
            </Box>
          )}
        </Menu>

        {/* Mobile Main Menu */}
        <Menu
          anchorEl={mainMenuAnchor}
          open={Boolean(mainMenuAnchor)}
          onClose={handleMainMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { 
              width: '80vw',
              maxWidth: 280,
              borderRadius: 2,
              mt: 1,
              mx: 2,
            }
          }}
          disableScrollLock={false}
        >
          {showUserInfo && (
            <>
              {/* Profile Section */}
              <MenuItem 
                onClick={handleProfileClick}
                sx={{ py: 2 }}
              >
                <ListItemIcon>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem'
                    }}
                  >
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </Avatar>
                </ListItemIcon>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.email}
                  </Typography>
                </Box>
              </MenuItem>
              
              <Divider />
            </>
          )}
          
          <MenuItem onClick={handleDashboardClick}>
            <ListItemIcon>
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            Dashboard
          </MenuItem>
          
          <MenuItem onClick={handleProfileClick}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>

          {/* Custom User Actions */}
          {userActions}
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Decline Confirmation Dialog for Mobile */}
        <DeclineConfirmationDialog />
      </>
    );
  }

  // Desktop Header
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      mb: variant === 'dashboard' ? 0 : 4,
      px: { xs: 2, sm: 3 },
      pt: variant === 'dashboard' ? 4 : 3,
      ...sx
    }}>
      <Box sx={{ flex: 1 }}>
        {/* Back Button and Title Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          {showBackButton && (
            <IconButton 
              onClick={handleBackClick}
              sx={{ 
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: 'grey.50',
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box>
            {title && (
              <Typography 
                variant={variant === 'dashboard' ? 'h3' : 'h4'}
                sx={{ 
                  fontWeight: 700,
                  fontSize: variant === 'dashboard' 
                    ? { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
                    : { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  background: variant === 'dashboard' 
                    ? 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)'
                    : 'linear-gradient(45deg, #1e40af 30%, #6d28d9 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  lineHeight: 1.1
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography 
                variant={variant === 'dashboard' ? 'h6' : 'body1'}
                sx={{ 
                  color: 'text.secondary',
                  fontSize: variant === 'dashboard' 
                    ? { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
                    : { xs: '0.875rem', sm: '0.9rem', md: '1rem' },
                  fontWeight: 400,
                  mt: variant === 'dashboard' ? 1 : 0.5
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* Custom Actions */}
        {customActions}
        
        {/* Notifications Bell */}
        <IconButton 
          onClick={handleNotificationClick}
          sx={{
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'grey.50',
            }
          }}
        >
          <Badge badgeContent={unreadNotifications.length} color="error">
            <NotificationIcon />
          </Badge>
        </IconButton>

        {/* User Menu */}
        {showUserInfo ? (
          <IconButton 
            onClick={handleMainMenuClick}
            sx={{
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                backgroundColor: 'grey.50',
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main',
                fontSize: '0.875rem'
              }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
          </IconButton>
        ) : (
          <IconButton 
            onClick={handleMainMenuClick}
            sx={{
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                backgroundColor: 'grey.50',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Desktop Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchor}
        open={Boolean(notificationsAnchor)}
        onClose={handleNotificationClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 420,
            maxWidth: '92vw',
            maxHeight: 520,
            borderRadius: 3,
            mt: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
        </Box>
        
        {renderNotificationContent()}
        
        {notifications.length > 0 && (
          <Box sx={{ 
            p: 1, 
            borderTop: 1, 
            borderColor: 'divider',
            flexShrink: 0 
          }}>
            <Button 
              fullWidth 
              onClick={handleNotificationClose}
              sx={{ borderRadius: 2 }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>

      {/* Desktop Main Menu */}
      <Menu
        anchorEl={mainMenuAnchor}
        open={Boolean(mainMenuAnchor)}
        onClose={handleMainMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 280,
            borderRadius: 2,
            mt: 1
          }
        }}
      >
        {showUserInfo && (
          <>
            {/* Profile Section */}
            <MenuItem 
              onClick={handleProfileClick}
              sx={{ py: 2 }}
            >
              <ListItemIcon>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: 'primary.main',
                    fontSize: '0.875rem'
                  }}
                >
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </Avatar>
              </ListItemIcon>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>
            
            <Divider />
          </>
        )}
        
        <MenuItem onClick={handleDashboardClick}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          Dashboard
        </MenuItem>
        
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>

        {/* Custom User Actions */}
        {userActions}
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      {/* Decline Confirmation Dialog for Desktop */}
      <DeclineConfirmationDialog />
    </Box>
  );
};

export default CommonHeader;