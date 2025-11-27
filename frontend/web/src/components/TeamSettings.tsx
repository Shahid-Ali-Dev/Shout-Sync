import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  TextField,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  CircularProgress,
  alpha,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
  CardActionArea,
  InputAdornment,
  Fab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Groups as GroupsIcon,
  Security as SecurityIcon,
  TransferWithinAStation as TransferIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Notifications as NotificationsIcon,
  Folder as FolderIcon,
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import { logout } from '../shared/store/slices/authSlice';
import CommonHeader from '../components/CommonHeader';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_by_name: string;
  created_at: string;
  project_count?: number;
}

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
    last_active: string;
  };
  role: number;
  joined_at: string;
  is_active: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-settings-tabpanel-${index}`}
      aria-labelledby={`team-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const TeamSettings: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });
  
  // Settings state
  const [teamData, setTeamData] = useState({
    name: '',
    description: '',
  });
  
  // Member management
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<null | HTMLElement>(null);
const selectedMember = members.find(m => m.id === selectedMemberId) || null;
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [newOwnerId, setNewOwnerId] = useState<string>('');
  const [newRole, setNewRole] = useState<number>(3);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Invitation state
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 3,
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Team settings state
  const [teamSettings, setTeamSettings] = useState({
    allow_public_invites: false,
    require_approval: true,
    default_role: 3,
    allow_guest_access: false,
    enable_team_analytics: true,
    enable_file_sharing: true,
    max_file_size: 100, // MB
    enable_team_chat: true,
  });

  // Public invite link state
  const [publicInviteLink, setPublicInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Load team data
  const loadTeam = async () => {
    try {
      const response = await teamAPI.getTeam(teamId!);
      setTeam(response.data);
      setTeamData({
        name: response.data.name,
        description: response.data.description || '',
      });
    } catch (error: any) {
      console.error('Failed to load team:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load team details', 
        severity: 'error' 
      });
    }
  };

  // Load team members
  const loadMembers = async () => {
    try {
      const response = await teamAPI.getTeamMembers(teamId!);
      setMembers(response.data);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load team members', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      loadTeam();
      loadMembers();
      // Generate public invite link
      setPublicInviteLink(`${window.location.origin}/team/${teamId}/join`);
    }
  }, [teamId]);

  // Helper functions
  const getRoleLabel = (role: number): string => {
    const roles = {
      1: 'Owner',
      2: 'Admin',
      3: 'Member',
      4: 'Guest',
    };
    return roles[role as keyof typeof roles] || 'Member';
  };

  const getRoleColor = (role: number): string => {
    const colors = {
      1: 'error',
      2: 'warning',
      3: 'primary',
      4: 'default',
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  const getRoleIcon = (role: number) => {
    const icons = {
      1: <ShieldIcon fontSize="small" />,
      2: <EditIcon fontSize="small" />,
      3: <PersonIcon fontSize="small" />,
      4: <VisibilityIcon fontSize="small" />,
    };
    return icons[role as keyof typeof icons] || <PersonIcon fontSize="small" />;
  };

  const formatLastActive = (lastActive: string): string => {
    if (!lastActive || lastActive === 'null' || lastActive === 'undefined') {
      return 'Never';
    }
    
    try {
      const date = new Date(lastActive);
      if (isNaN(date.getTime())) {
        return 'Never';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 1000 / 60);
      
      if (diffMins < 5) {
        return 'Online';
      }
      
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  // Permission checks
  const currentUserMember = members.find(m => m.user.id === user?.id);
  const isOwner = currentUserMember?.role === 1;
  const isAdmin = currentUserMember?.role === 2;
  const canManage = isOwner || isAdmin;

  const canManageMember = (member: Member): boolean => {
    if (member.user.id === user?.id) return false;
    if (isOwner) return member.role !== 1;
    if (isAdmin) return member.role === 3 || member.role === 4;
    return false;
  };

  // Save team settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await teamAPI.updateTeam(teamId!, teamData);
      setSnackbar({ 
        open: true, 
        message: 'Team settings updated successfully', 
        severity: 'success' 
      });
      await loadTeam();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update team';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Invite member handler
  const handleInviteMember = async () => {
    if (!inviteData.email.trim()) {
      setSnackbar({ 
        open: true, 
        message: 'Please enter a valid email address', 
        severity: 'warning' 
      });
      return;
    }

    try {
      setInviteLoading(true);
      await teamAPI.inviteMember(teamId!, inviteData);
      setSnackbar({ 
        open: true, 
        message: `Invitation sent to ${inviteData.email}`, 
        severity: 'success' 
      });
      setInviteDialogOpen(false);
      setInviteData({ email: '', role: 3 });
      await loadMembers(); // Reload to show updated member count
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send invitation';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setInviteLoading(false);
    }
  };

// Update member role handler - FIXED VERSION
const handleUpdateMemberRole = async () => {
  if (!selectedMemberId || !selectedMember) {
    console.error('❌ No member selected for role update');
    setSnackbar({ 
      open: true, 
      message: 'No member selected', 
      severity: 'error' 
    });
    return;
  }

  try {
    setActionLoading(true);
    
    // Use the API call
    const response = await teamAPI.updateMemberRole(teamId!, selectedMemberId, { role: newRole });
    
    setSnackbar({ 
      open: true, 
      message: `Updated ${selectedMember.user.first_name}'s role to ${getRoleLabel(newRole)}`, 
      severity: 'success' 
    });
    
    // Reload members to reflect the change
    await loadMembers();
    closeRoleDialog(); // Use the fixed close function
    
  } catch (error: any) {
    console.error('❌ Role update failed:', error);
    
    const message = error.response?.data?.error || 
                   error.response?.data?.message || 
                   'Failed to update member role';
    
    setSnackbar({ 
      open: true, 
      message, 
      severity: 'error' 
    });
  } finally {
    setActionLoading(false);
  }
};

  // Remove member handler
  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      setActionLoading(true);
      await teamAPI.removeMember(teamId!, selectedMember.id);
      setSnackbar({ 
        open: true, 
        message: `${selectedMember.user.first_name} has been removed from the team`, 
        severity: 'success' 
      });
      setRemoveMemberDialogOpen(false);
      setSelectedMemberId(null);
      await loadMembers();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to remove member';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Transfer ownership handler
  const handleTransferOwnership = async () => {
    if (!newOwnerId) {
      setSnackbar({ 
        open: true, 
        message: 'Please select a new owner', 
        severity: 'error' 
      });
      return;
    }

    try {
      setActionLoading(true);
      await teamAPI.transferOwnership(teamId!, newOwnerId);
      setSnackbar({ 
        open: true, 
        message: 'Ownership transferred successfully', 
        severity: 'success' 
      });
      setTransferDialogOpen(false);
      setNewOwnerId('');
      // Redirect to dashboard after transfer
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to transfer ownership';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete team handler
  const handleDeleteTeam = async () => {
    if (confirmationText !== team?.name) {
      setSnackbar({ 
        open: true, 
        message: 'Team name does not match', 
        severity: 'error' 
      });
      return;
    }

    try {
      setActionLoading(true);
      await teamAPI.deleteTeam(teamId!, { confirmation_name: confirmationText });
      setSnackbar({ 
        open: true, 
        message: 'Team deleted successfully', 
        severity: 'success' 
      });
      setDeleteDialogOpen(false);
      setConfirmationText('');
      // Redirect to dashboard after deletion
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete team';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Member menu handlers
const handleMemberMenuOpen = (event: React.MouseEvent<HTMLElement>, member: Member) => {
  setMemberMenuAnchor(event.currentTarget);
  setSelectedMemberId(member.id); // Store ID instead of full object
  setNewRole(member.role);
};

const handleMemberMenuClose = () => {
  setMemberMenuAnchor(null);
  // Don't clear selectedMemberId here - we need it for the dialog
};

  const openRoleDialog = () => {
    setRoleDialogOpen(true);
    handleMemberMenuClose();
  };

  const closeRoleDialog = () => {
  setRoleDialogOpen(false);
  setSelectedMemberId(null); // Clear only when dialog fully closes
  setNewRole(3); // Reset to default
};

  const openRemoveMemberDialog = () => {
    setRemoveMemberDialogOpen(true);
    handleMemberMenuClose();
  };

  // Invite link handlers
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(publicInviteLink);
      setLinkCopied(true);
      setSnackbar({ 
        open: true, 
        message: 'Invite link copied to clipboard', 
        severity: 'success' 
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to copy link', 
        severity: 'error' 
      });
    }
  };

  const generateNewInviteLink = () => {
    // In a real app, this would generate a new token on the backend
    const newToken = Math.random().toString(36).substring(2, 15);
    setPublicInviteLink(`${window.location.origin}/team/${teamId}/join?token=${newToken}`);
    setSnackbar({ 
      open: true, 
      message: 'New invite link generated', 
      severity: 'success' 
    });
  };

  // Custom actions for CommonHeader
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Tooltip title="Team Dashboard">
        <IconButton 
          onClick={() => navigate(`/team/${teamId}`)}
          sx={{ 
            backgroundColor: 'primary.50',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.100',
            }
          }}
        >
          <DashboardIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Team Projects">
        <IconButton 
          onClick={() => navigate(`/team/${teamId}/projects`)}
          sx={{ 
            backgroundColor: 'secondary.50',
            color: 'secondary.main',
            '&:hover': {
              backgroundColor: 'secondary.100',
            }
          }}
        >
          <FolderIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
          <Typography variant="h6" color="text.secondary" fontWeight="500">
            Loading team settings...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <CommonHeader 
          showBackButton
          backButtonPath="/dashboard"
          title="Team Not Found"
          variant="page"
        />
        <Container sx={{ py: 8 }}>
          <Paper 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              borderRadius: 4,
              backgroundColor: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
            <Typography variant="h4" gutterBottom fontWeight="600" color="text.primary">
              Team Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              The team you're looking for doesn't exist or you don't have permission to access it.
            </Typography>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontWeight: '600',
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!canManage) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <CommonHeader 
          showBackButton
          backButtonPath={`/team/${teamId}`}
          title="Access Denied"
          variant="page"
        />
        <Container sx={{ py: 8 }}>
          <Paper 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              borderRadius: 4,
              backgroundColor: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <SecurityIcon sx={{ fontSize: 80, color: 'warning.main', mb: 3 }} />
            <Typography variant="h4" gutterBottom fontWeight="600" color="text.primary">
              Access Restricted
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              You need to be an admin or owner to access team settings.
            </Typography>
            <Button 
              onClick={() => navigate(`/team/${teamId}`)}
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontWeight: '600',
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              Back to Team
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Enhanced Header */}
      <CommonHeader 
        showBackButton
        backButtonPath={`/team/${teamId}`}
        title={`${team.name} - Settings`}
        subtitle="Manage your team configuration and members"
        customActions={headerActions}
        variant="page"
      />

      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Tabs Navigation */}
        <Paper 
          sx={{ 
            borderRadius: 3,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4,
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{ 
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: '500',
                fontSize: '1rem',
                py: 2,
                minHeight: '60px',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: '600'
                }
              }
            }}
          >
            <Tab 
              icon={<EditIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label="General" 
            />
            <Tab 
              icon={<GroupsIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label="Members" 
            />
            <Tab 
              icon={<PersonAddIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label="Invitations" 
            />
            <Tab 
              icon={<SecurityIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label="Security" 
            />
            {isOwner && (
              <Tab 
                icon={<SecurityIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Danger Zone" 
                sx={{ color: 'error.main' }}
              />
            )}
          </Tabs>

          <Box sx={{ p: 4 }}>
            {/* General Settings Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={4}>
                <Grid item xs={12} lg={8}>
                  <Card sx={{ borderRadius: 3, mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" />
                        Team Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Update your team's basic information and description.
                      </Typography>

                      <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                          <TextField
                            label="Team Name"
                            fullWidth
                            value={teamData.name}
                            onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: 2,
                                '&:hover fieldset': {
                                  borderColor: 'primary.main',
                                }
                              } 
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={4}
                            value={teamData.description}
                            onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: 2,
                                '&:hover fieldset': {
                                  borderColor: 'primary.main',
                                }
                              } 
                            }}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                          onClick={handleSaveSettings}
                          disabled={saving}
                          sx={{ 
                            borderRadius: 2,
                            px: 4,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => navigate(`/team/${teamId}`)}
                          sx={{ 
                            borderRadius: 2,
                            px: 4,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: '500'
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DashboardIcon color="primary" />
                        Team Stats
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Created By
                          </Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupsIcon fontSize="small" color="action" />
                            {team.created_by_name}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Team Members
                          </Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupsIcon fontSize="small" color="action" />
                            {team.member_count} members
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Active Projects
                          </Typography>
                          <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FolderIcon fontSize="small" color="action" />
                            {team.project_count || 0} projects
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Your Role
                          </Typography>
                          <Chip
                            icon={getRoleIcon(currentUserMember?.role || 3)}
                            label={getRoleLabel(currentUserMember?.role || 3)}
                            color={getRoleColor(currentUserMember?.role || 3) as any}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Members Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight="600">
                    Team Members
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage team members and their permissions
                  </Typography>
                </Box>
                
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setInviteDialogOpen(true)}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: '600'
                    }}
                  >
                    Invite Member
                  </Button>
                )}
              </Box>

              <Paper 
                sx={{ 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden'
                }}
              >
                {members.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <GroupsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="500">
                      No Members Yet
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
                      Start by inviting team members to collaborate.
                    </Typography>
                    {canManage && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setInviteDialogOpen(true)}
                        sx={{ borderRadius: 2 }}
                      >
                        Invite Your First Member
                      </Button>
                    )}
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {members.map((member, index) => (
                      <React.Fragment key={member.id}>
                        <ListItem 
                          sx={{
                            px: 3,
                            py: 2.5,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'grey.50',
                            }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 72, mr: 1 }}>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ 
                                vertical: 'bottom', 
                                horizontal: 'right' 
                              }}
                              variant="dot"
                              color="success"
                              invisible={formatLastActive(member.user.last_active) !== 'Online'}
                              sx={{
                                '& .MuiBadge-badge': {
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                  backgroundColor: '#4CAF50',
                                }
                              }}
                            >
                              <Avatar 
                                sx={{ 
                                  width: 56, 
                                  height: 56,
                                  bgcolor: 'primary.main',
                                  fontSize: '1rem',
                                  fontWeight: '600'
                                }}
                              >
                                {member.user.first_name?.[0]}{member.user.last_name?.[0]}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          
                          {/* FIXED: Proper ListItemText structure without nested Typography */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Primary content - name and role chips */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                              <Typography 
                                component="div" 
                                variant="h6" 
                                fontWeight="600"
                                sx={{ 
                                  color: 'text.primary',
                                  fontSize: '1.125rem'
                                }}
                              >
                                {member.user.first_name} {member.user.last_name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  icon={getRoleIcon(member.role)}
                                  label={getRoleLabel(member.role)}
                                  color={getRoleColor(member.role) as any}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                                {member.user.id === user?.id && (
                                  <Chip 
                                    label="You" 
                                    size="small" 
                                    color="primary" 
                                    variant="filled"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            </Box>
                            
                            {/* Secondary content - email and status */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography 
                                component="div"
                                variant="body2" 
                                color="text.secondary"
                                sx={{ lineHeight: 1.4 }}
                              >
                                {member.user.email}
                              </Typography>
                              <Typography 
                                component="div"
                                variant="caption" 
                                color={formatLastActive(member.user.last_active) === 'Online' ? 'success.main' : 'text.secondary'}
                                sx={{ 
                                  fontWeight: formatLastActive(member.user.last_active) === 'Online' ? 600 : 400,
                                  lineHeight: 1.2
                                }}
                              >
                                {formatLastActive(member.user.last_active) === 'Online' 
                                  ? 'Online' 
                                  : `Last active: ${formatLastActive(member.user.last_active)}`
                                }
                              </Typography>
                            </Box>
                          </Box>
                          
                          <ListItemSecondaryAction>
                            {canManageMember(member) && (
                              <IconButton
                                onClick={(e) => handleMemberMenuOpen(e, member)}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'action.hover'
                                  }
                                }}
                              >
                                <MoreIcon />
                              </IconButton>
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < members.length - 1 && (
                          <Divider variant="inset" component="li" sx={{ mx: 3 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </TabPanel>

            {/* Invitations Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon color="primary" />
                        Invite by Email
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Send personalized invitations to team members via email.
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField
                          label="Email Address"
                          type="email"
                          fullWidth
                          value={inviteData.email}
                          onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                          placeholder="Enter email address to invite"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2,
                            } 
                          }}
                        />
                        
                        <FormControl fullWidth>
                          <InputLabel>Role</InputLabel>
                          <Select
                            value={inviteData.role}
                            label="Role"
                            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as number })}
                            sx={{ borderRadius: 2 }}
                          >
                            <MenuItem value={3}>Member</MenuItem>
                            <MenuItem value={4}>Guest</MenuItem>
                            {isOwner && <MenuItem value={2}>Admin</MenuItem>}
                          </Select>
                        </FormControl>

                        <Button
                          variant="contained"
                          startIcon={inviteLoading ? <CircularProgress size={16} /> : <PersonAddIcon />}
                          onClick={handleInviteMember}
                          disabled={!inviteData.email.trim() || inviteLoading}
                          sx={{ 
                            borderRadius: 2,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                        >
                          {inviteLoading ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkIcon color="primary" />
                        Invite Link
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Share this link to allow people to join your team directly.
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          value={publicInviteLink}
                          fullWidth
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={linkCopied ? "Copied!" : "Copy link"}>
                                  <IconButton onClick={copyInviteLink}>
                                    {linkCopied ? <CheckIcon color="success" /> : <CopyIcon />}
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2,
                            } 
                          }}
                        />

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={generateNewInviteLink}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: '500'
                            }}
                          >
                            Generate New Link
                          </Button>
                          
                          <Button
                            variant="outlined"
                            startIcon={<QrCodeIcon />}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: '500'
                            }}
                          >
                            QR Code
                          </Button>
                        </Box>

                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.allow_public_invites}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                allow_public_invites: e.target.checked
                              })}
                            />
                          }
                          label="Allow public invitations"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon color="primary" />
                        Security Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Configure security and privacy settings for your team.
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.require_approval}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                require_approval: e.target.checked
                              })}
                            />
                          }
                          label="Require approval for new members"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.allow_guest_access}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                allow_guest_access: e.target.checked
                              })}
                            />
                          }
                          label="Allow guest access"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.enable_team_analytics}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                enable_team_analytics: e.target.checked
                              })}
                            />
                          }
                          label="Enable team analytics"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.enable_file_sharing}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                enable_file_sharing: e.target.checked
                              })}
                            />
                          }
                          label="Enable file sharing"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={teamSettings.enable_team_chat}
                              onChange={(e) => setTeamSettings({
                                ...teamSettings,
                                enable_team_chat: e.target.checked
                              })}
                            />
                          }
                          label="Enable team chat"
                        />

                        <Box>
                          <Typography variant="body2" fontWeight="600" gutterBottom>
                            Maximum File Size (MB)
                          </Typography>
                          <TextField
                            type="number"
                            value={teamSettings.max_file_size}
                            onChange={(e) => setTeamSettings({
                              ...teamSettings,
                              max_file_size: parseInt(e.target.value) || 100
                            })}
                            sx={{ maxWidth: 200 }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          sx={{ 
                            borderRadius: 2,
                            px: 4,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                        >
                          Save Security Settings
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <NotificationsIcon color="primary" />
                        Activity Log
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Recent security and team activity.
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight="600">
                            Settings updated
                          </Typography>
                          <Typography variant="caption">
                            Team settings were modified by {user?.first_name}
                          </Typography>
                        </Alert>

                        <Alert severity="success" sx={{ borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight="600">
                            Member joined
                          </Typography>
                          <Typography variant="caption">
                            New member joined the team
                          </Typography>
                        </Alert>

                        <Button
                          variant="outlined"
                          fullWidth
                          sx={{ 
                            borderRadius: 2,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: '500'
                          }}
                        >
                          View Full Activity Log
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Danger Zone Tab */}
            {isOwner && (
              <TabPanel value={tabValue} index={4}>
                <Card sx={{ borderRadius: 3, border: '2px solid', borderColor: 'error.main' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                      <SecurityIcon />
                      Danger Zone
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      These actions are irreversible. Please be cautious.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* Transfer Ownership */}
                      <Paper 
                        sx={{ 
                          p: 3, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'warning.main',
                          backgroundColor: 'warning.50'
                        }}
                      >
                        <Typography variant="h6" gutterBottom color="warning.dark">
                          Transfer Ownership
                        </Typography>
                        <Typography variant="body2" paragraph color="warning.dark">
                          Transfer ownership of this team to another member. You will become an admin.
                        </Typography>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<TransferIcon />}
                          onClick={() => setTransferDialogOpen(true)}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                        >
                          Transfer Ownership
                        </Button>
                      </Paper>

                      {/* Delete Team */}
                      <Paper 
                        sx={{ 
                          p: 3, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'error.main',
                          backgroundColor: 'error.50',
                        }}
                      >
                        <Typography variant="h6" gutterBottom color="error.dark">
                          Delete Team
                        </Typography>
                        <Typography variant="body2" paragraph color="error.dark">
                          Permanently delete this team and all its data. This action cannot be undone.
                        </Typography>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => setDeleteDialogOpen(true)}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: '600',
                          }}
                        >
                          Delete Team
                        </Button>
                      </Paper>
                    </Box>
                  </CardContent>
                </Card>
              </TabPanel>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Invite Member Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => !inviteLoading && setInviteDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonAddIcon />
            Invite to {team.name}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              placeholder="Enter email address to invite"
              disabled={inviteLoading}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                } 
              }}
            />
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                Assign Role
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { value: 3, label: 'Member', color: 'primary' as const },
                  { value: 4, label: 'Guest', color: 'default' as const },
                  ...(isOwner ? [{ value: 2, label: 'Admin', color: 'warning' as const }] : [])
                ].map((role) => (
                  <Chip
                    key={role.value}
                    label={role.label}
                    color={role.color}
                    variant={inviteData.role === role.value ? 'filled' : 'outlined'}
                    onClick={() => setInviteData({ ...inviteData, role: role.value })}
                    clickable
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setInviteDialogOpen(false)}
            disabled={inviteLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInviteMember} 
            variant="contained"
            disabled={!inviteData.email.trim() || inviteLoading}
            startIcon={inviteLoading ? <CircularProgress size={16} /> : <EmailIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={roleDialogOpen} 
        onClose={() => !actionLoading && closeRoleDialog()} // Use fixed close function
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon />
            Update Member Role
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          {selectedMember ? (
            <>
              <Typography paragraph sx={{ mb: 3, mt: 2 }}>
                Update role for <strong>{selectedMember.user.first_name} {selectedMember.user.last_name}</strong>:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { 
                    value: 2, 
                    label: 'Admin', 
                    description: 'Can manage members and projects, create and delete content',
                    color: 'warning' as const,
                    icon: <EditIcon />
                  },
                  { 
                    value: 3, 
                    label: 'Member', 
                    description: 'Can participate in projects, create and edit content',
                    color: 'primary' as const,
                    icon: <PersonIcon />
                  },
                  { 
                    value: 4, 
                    label: 'Guest', 
                    description: 'Limited access, view-only with restricted permissions',
                    color: 'default' as const,
                    icon: <VisibilityIcon />
                  },
                ].map((role) => (
                  <Card
                    key={role.value}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      border: '2px solid',
                      borderColor: newRole === role.value ? `${role.color}.main` : 'divider',
                      backgroundColor: newRole === role.value ? `${role.color}.50` : 'transparent',
                      cursor: actionLoading ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: actionLoading ? 0.6 : 1,
                      '&:hover': {
                        borderColor: actionLoading ? 'divider' : `${role.color}.main`,
                        backgroundColor: actionLoading ? 'transparent' : `${role.color}.50`
                      }
                    }}
                    onClick={() => !actionLoading && setNewRole(role.value)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        color: `${role.color}.main`,
                        flexShrink: 0
                      }}>
                        {role.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 0.5 }}>
                          {role.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                      {newRole === role.value && (
                        <Box sx={{ ml: 'auto', color: `${role.color}.main` }}>
                          <CheckCircleIcon />
                        </Box>
                      )}
                    </Box>
                  </Card>
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No member selected
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={closeRoleDialog}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateMemberRole} 
            variant="contained"
            disabled={actionLoading || !selectedMember || newRole === selectedMember.role}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {actionLoading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Remove Member Dialog */}
      <Dialog 
        open={removeMemberDialogOpen} 
        onClose={() => !actionLoading && setRemoveMemberDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'error.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DeleteIcon />
            Remove Member
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.light',
              mt: 2
            }}
          >
            This action cannot be undone. The member will lose access to all team resources.
          </Alert>
          
          <Typography>
            Are you sure you want to remove <strong>{selectedMember?.user.first_name} {selectedMember?.user.last_name}</strong> from <strong>{team.name}</strong>?
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setRemoveMemberDialogOpen(false)}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRemoveMember} 
            variant="contained" 
            color="error"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {actionLoading ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog 
        open={transferDialogOpen} 
        onClose={() => !actionLoading && setTransferDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'warning.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TransferIcon />
            Transfer Ownership
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.light',
              mt: 2
            }}
          >
            You are about to transfer ownership of this team. You will become an admin.
          </Alert>
          
          <Typography paragraph>
            Select the new owner:
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>New Owner</InputLabel>
            <Select
              value={newOwnerId}
              label="New Owner"
              onChange={(e: SelectChangeEvent<string>) => setNewOwnerId(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {members
                .filter(member => member.user.id !== user?.id && member.role !== 4)
                .map(member => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.user.first_name} {member.user.last_name} ({getRoleLabel(member.role)})
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => {
              setTransferDialogOpen(false);
              setNewOwnerId('');
            }}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleTransferOwnership} 
            variant="contained" 
            color="warning"
            disabled={!newOwnerId || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <TransferIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {actionLoading ? 'Transferring...' : 'Transfer Ownership'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => !actionLoading && setDeleteDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'error.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DeleteIcon />
            Delete Team
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'error.light',
              mt: 2
            }}
          >
            This action cannot be undone. All team data will be permanently deleted.
          </Alert>
          
          <Typography paragraph>
            To confirm, please type the team name: <strong>{team.name}</strong>
          </Typography>
          
          <TextField
            fullWidth
            placeholder={`Type "${team.name}" to confirm`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={actionLoading}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2,
              } 
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setConfirmationText('');
            }}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteTeam} 
            variant="contained" 
            color="error"
            disabled={confirmationText !== team.name || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {actionLoading ? 'Deleting...' : 'Delete Team'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Management Menu */}
      <Menu
        anchorEl={memberMenuAnchor}
        open={Boolean(memberMenuAnchor)}
        onClose={handleMemberMenuClose}
        PaperProps={{
          sx: { 
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <MenuItem onClick={openRoleDialog}>
          Change Role
        </MenuItem>
        <MenuItem 
          onClick={openRemoveMemberDialog}
          sx={{ color: 'error.main' }}
        >
          Remove Member
        </MenuItem>
        {isOwner && selectedMember && selectedMember.role !== 1 && (
          <MenuItem 
            onClick={() => { 
              setTransferDialogOpen(true); 
              setNewOwnerId(selectedMember.id);
              handleMemberMenuClose(); 
            }}
            sx={{ color: 'warning.main' }}
          >
            Transfer Ownership
          </MenuItem>
        )}
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ 
            borderRadius: 2,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            alignItems: 'center'
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Mobile */}
      {isMobile && canManage && (
        <Fab
          color="primary"
          aria-label="invite member"
          onClick={() => setInviteDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            boxShadow: '0 8px 30px rgba(37, 99, 235, 0.3)',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(37, 99, 235, 0.4)',
            }
          }}
        >
          <PersonAddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default TeamSettings;