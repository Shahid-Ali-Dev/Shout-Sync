import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Badge,
  ListItemIcon,
  CardActionArea,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreIcon,
  Groups as GroupsIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as LeaveIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Folder as ProjectIcon,
  Notifications as NotificationIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  Visibility as ViewIcon,
  GroupAdd as GroupAddIcon,
  CalendarToday as CalendarIcon,
  Workspaces as WorkspaceIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import { projectAPI } from '../shared/services/projectAPI';
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

// Project Status Constants
const PROJECT_STATUS = {
  PLANNING: 1,
  ACTIVE: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
  CANCELLED: 5
};

const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [showProjectList, setShowProjectList] = useState(false);

  // Project stats state
  const [projectStats, setProjectStats] = useState({
    active: 0,
    completed: 0,
    onHold: 0,
    planning: 0,
    cancelled: 0,
    total: 0
  });
  const [selectedProjectStatus, setSelectedProjectStatus] = useState<number | 'all'>('all');
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamMenuAnchor, setTeamMenuAnchor] = useState<null | HTMLElement>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [leaveTeamDialogOpen, setLeaveTeamDialogOpen] = useState(false);
  const [roleUpdateDialogOpen, setRoleUpdateDialogOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<Member | null>(null);
  
  // Form states
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 3, // Default to Member role
  });
  const [newRole, setNewRole] = useState<number>(3);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  // Load team data
  const loadTeam = async () => {
    try {
      setError(null);
      const response = await teamAPI.getTeam(teamId!);
      setTeam(response.data);
    } catch (error: any) {
      console.error('Failed to load team:', error);
      setError('Failed to load team details');
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
      setError(null);
      const response = await teamAPI.getTeamMembers(teamId!);
      setMembers(response.data);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      setError('Failed to load team members');
      setSnackbar({ 
        open: true, 
        message: 'Failed to load team members', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  // Load project statistics
  const loadProjectStats = async () => {
    try {
      if (!teamId) return;
      
      const response = await projectAPI.getProjects(teamId);
      const projects = response.data;
      
      const stats = {
        active: projects.filter((p: any) => p.status === PROJECT_STATUS.ACTIVE).length,
        completed: projects.filter((p: any) => p.status === PROJECT_STATUS.COMPLETED).length,
        onHold: projects.filter((p: any) => p.status === PROJECT_STATUS.ON_HOLD).length,
        planning: projects.filter((p: any) => p.status === PROJECT_STATUS.PLANNING).length,
        cancelled: projects.filter((p: any) => p.status === PROJECT_STATUS.CANCELLED).length,
        total: projects.length
      };
      
      setProjectStats(stats);
    } catch (error) {
      console.error('Failed to load project stats:', error);
    }
  };

  // Initial data loading
  useEffect(() => {
    if (teamId) {
      setPageLoading(true);
      loadTeam();
      loadMembers();
      loadProjectStats();
    }
  }, [teamId]);

  // Project status selection handler
// Replace the handleProjectStatusSelect function with this:
const handleProjectStatusSelect = async (status: number | 'all') => {
  setSelectedProjectStatus(status);
  setShowProjectList(true);
  
  try {
    if (!teamId) return;
    
    const response = await projectAPI.getProjects(teamId);
    const allProjects = response.data;
    
    let filtered = allProjects;
    if (status !== 'all') {
      filtered = allProjects.filter((project: any) => project.status === status);
    }
    
    setFilteredProjects(filtered);
  } catch (error) {
    console.error('Failed to load filtered projects:', error);
    setSnackbar({
      open: true,
      message: 'Failed to load projects',
      severity: 'error'
    });
  }
};

// Add this function to handle closing the project list
const handleCloseProjectList = () => {
  setShowProjectList(false);
  setSelectedProjectStatus('all');
};

// Add this function to get project status label
const getProjectStatusText = (status: number) => {
  switch (status) {
    case PROJECT_STATUS.PLANNING: return 'Planning';
    case PROJECT_STATUS.ACTIVE: return 'Active';
    case PROJECT_STATUS.ON_HOLD: return 'On Hold';
    case PROJECT_STATUS.COMPLETED: return 'Completed';
    case PROJECT_STATUS.CANCELLED: return 'Cancelled';
    default: return 'Unknown';
  }
};

// Add this function to get project status color
const getProjectStatusColor = (status: number) => {
  switch (status) {
    case PROJECT_STATUS.PLANNING: return 'default';
    case PROJECT_STATUS.ACTIVE: return 'success';
    case PROJECT_STATUS.ON_HOLD: return 'warning';
    case PROJECT_STATUS.COMPLETED: return 'info';
    case PROJECT_STATUS.CANCELLED: return 'error';
    default: return 'default';
  }
};

  // Get the display count based on selected status
  const getProjectDisplayCount = () => {
    switch (selectedProjectStatus) {
      case 'all': return projectStats.total;
      case PROJECT_STATUS.PLANNING: return projectStats.planning;
      case PROJECT_STATUS.ACTIVE: return projectStats.active;
      case PROJECT_STATUS.ON_HOLD: return projectStats.onHold;
      case PROJECT_STATUS.COMPLETED: return projectStats.completed;
      case PROJECT_STATUS.CANCELLED: return projectStats.cancelled;
      default: return projectStats.total;
    }
  };

  // Get the display label based on selected status
  const getProjectDisplayLabel = () => {
    switch (selectedProjectStatus) {
      case 'all': return 'Total Projects';
      case PROJECT_STATUS.PLANNING: return 'Planning';
      case PROJECT_STATUS.ACTIVE: return 'Active';
      case PROJECT_STATUS.ON_HOLD: return 'On Hold';
      case PROJECT_STATUS.COMPLETED: return 'Completed';
      case PROJECT_STATUS.CANCELLED: return 'Cancelled';
      default: return 'Projects';
    }
  };

const getProjectStatusColorInProjectDetail = (status: number | 'all') => {
  switch (status) {
    case 'all': return 'secondary';
    case PROJECT_STATUS.ACTIVE: return 'success';
    case PROJECT_STATUS.COMPLETED: return 'info';
    case PROJECT_STATUS.ON_HOLD: return 'warning';
    case PROJECT_STATUS.PLANNING: return 'default';
    case PROJECT_STATUS.CANCELLED: return 'error';
    default: return 'secondary';
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
      setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  // Leave team handler
  const handleLeaveTeam = async () => {
    try {
      setActionLoading(true);
      await teamAPI.leaveTeam(teamId!);
      setSnackbar({ 
        open: true, 
        message: 'Successfully left the team', 
        severity: 'success' 
      });
      setLeaveTeamDialogOpen(false);
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to leave team';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
      setLeaveTeamDialogOpen(false);
    }
  };

  // Remove member handler
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      setActionLoading(true);
      await teamAPI.removeMember(teamId!, memberToRemove.id);
      setSnackbar({ 
        open: true, 
        message: `${memberToRemove.user.first_name} has been removed from the team`, 
        severity: 'success' 
      });
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
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

  // Update role handler
  const handleUpdateRole = async () => {
    if (!memberToUpdate) return;

    try {
      setActionLoading(true);
      await teamAPI.updateMemberRole(teamId!, memberToUpdate.id, { role: newRole });
      setSnackbar({ 
        open: true, 
        message: `Updated ${memberToUpdate.user.first_name}'s role successfully`, 
        severity: 'success' 
      });
      setRoleUpdateDialogOpen(false);
      setMemberToUpdate(null);
      await loadMembers();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update role';
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

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
      2: <SettingsIcon fontSize="small" />,
      3: <PersonIcon fontSize="small" />,
      4: <ViewIcon fontSize="small" />,
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

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Permission checks
  const currentUserMember = members.find(m => m.user.id === user?.id);
  const isOwner = currentUserMember?.role === 1;
  const isAdmin = currentUserMember?.role === 2;
  const canManage = isOwner || isAdmin;

  const canRemoveMember = (member: Member): boolean => {
    if (member.user.id === user?.id) return false;
    if (isOwner) return member.role !== 1;
    if (isAdmin) return member.role === 3 || member.role === 4;
    return false;
  };

  const canUpdateRole = (member: Member): boolean => {
    if (member.user.id === user?.id) return false;
    if (isOwner) return member.role !== 1;
    if (isAdmin) return member.role === 3 || member.role === 4;
    return false;
  };

  // Dialog openers
  const openRemoveMemberDialog = (member: Member) => {
    setMemberToRemove(member);
    setRemoveMemberDialogOpen(true);
  };

  const openRoleUpdateDialog = (member: Member) => {
    setMemberToUpdate(member);
    setNewRole(member.role);
    setRoleUpdateDialogOpen(true);
  };

  // Custom actions for CommonHeader
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Tooltip title="Team Projects">
        <IconButton 
          onClick={() => navigate(`/team/${teamId}/projects`)}
          sx={{ 
            backgroundColor: 'primary.50',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.100',
            }
          }}
        >
          <ProjectIcon />
        </IconButton>
      </Tooltip>
      
      {canManage && (
        <Tooltip title="Invite Member">
          <IconButton 
            onClick={() => setInviteDialogOpen(true)}
            sx={{ 
              backgroundColor: 'secondary.50',
              color: 'secondary.main',
              '&:hover': {
                backgroundColor: 'secondary.100',
              }
            }}
          >
            <PersonAddIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  // Loading state
  if (pageLoading) {
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
            Loading team details...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error && !team) {
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

  if (!team) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Enhanced Header */}
      <CommonHeader 
        showBackButton
        backButtonPath="/dashboard"
        title={team.name}
        subtitle={team.description || "Team workspace"}
        customActions={headerActions}
        variant="page"
        sx={{ mb: 0 }}
      />

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'error.light'
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

{/* Team Stats Cards */}
<Grid container spacing={3} sx={{ mb: 6 }}>
  {/* Team Members Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        borderRadius: 3,
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ 
        p: 3, 
        '&:last-child': { pb: 3 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 2 }}>
          <Box sx={{ 
            p: 2.5, // Increased padding
            borderRadius: 3, 
            backgroundColor: 'primary.50',
            color: 'primary.main',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 70, // Fixed width
            height: 70, // Fixed height
          }}>
            <GroupsIcon sx={{ fontSize: 32 }} /> {/* Larger icon */}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
              Team Members
            </Typography>
            <Typography variant="h3" fontWeight="700" color="primary.main">
              {team.member_count}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ height: 24 }}></Box>
      </CardContent>
    </Card>
  </Grid>
  
  {/* Enhanced Projects Card - Selectable */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        borderRadius: 3,
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          borderColor: 'primary.main'
        }
      }}
      onClick={() => handleProjectStatusSelect('all')}
    >
      <CardContent sx={{ 
        p: 3, 
        '&:last-child': { pb: 3 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 2 }}>
            <Box sx={{ 
              p: 2.5, // Increased padding
              borderRadius: 3, 
              backgroundColor: 'secondary.50',
              color: 'secondary.main',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 70, // Fixed width
              height: 70, // Fixed height
            }}>
              <ProjectIcon sx={{ fontSize: 32 }} /> {/* Larger icon */}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {getProjectDisplayLabel()}
                </Typography>
                {/* Status Selector Dropdown */}
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectMenuAnchor(e.currentTarget);
                  }}
                  sx={{ 
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="h3" fontWeight="700" color="secondary.main">
                {getProjectDisplayCount()}
              </Typography>
            </Box>
          </Box>
          
          {/* Status Breakdown Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {[
              { status: 'all', label: 'All', count: projectStats.total, color: 'default' as const },
              { status: PROJECT_STATUS.ACTIVE, label: 'Active', count: projectStats.active, color: 'success' as const },
              { status: PROJECT_STATUS.COMPLETED, label: 'Completed', count: projectStats.completed, color: 'info' as const },
              { status: PROJECT_STATUS.ON_HOLD, label: 'On Hold', count: projectStats.onHold, color: 'warning' as const },
            ].map((item) => (
              <Chip
                key={item.status}
                label={`${item.count} ${item.label}`}
                size="small"
                color={item.color}
                variant={selectedProjectStatus === item.status ? 'filled' : 'outlined'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProjectStatusSelect(item.status as number | 'all');
                }}
                sx={{ 
                  height: 24,
                  fontSize: '0.7rem',
                  fontWeight: selectedProjectStatus === item.status ? 600 : 400
                }}
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Grid>

  {/* Online Now Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        borderRadius: 3,
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ 
        p: 3, 
        '&:last-child': { pb: 3 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 2 }}>
          <Box sx={{ 
            p: 2.5, // Increased padding
            borderRadius: 3, 
            backgroundColor: 'success.50',
            color: 'success.main',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 70, // Fixed width
            height: 70, // Fixed height
          }}>
            <PersonIcon sx={{ fontSize: 32 }} /> {/* Larger icon */}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
              Online Now
            </Typography>
            <Typography variant="h3" fontWeight="700" color="success.main">
              {members.filter(m => formatLastActive(m.user.last_active) === 'Online').length}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ height: 24 }}></Box>
      </CardContent>
    </Card>
  </Grid>

  {/* Your Role Card - Fixed */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        borderRadius: 3,
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ 
        p: 3, 
        '&:last-child': { pb: 3 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 2 }}>
          <Box sx={{ 
            p: 2.5, // Increased padding
            borderRadius: 3, 
            backgroundColor: 'warning.50',
            color: 'warning.main',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 70, // Fixed width
            height: 70, // Fixed height
          }}>
            <ShieldIcon sx={{ fontSize: 32 }} /> {/* Larger icon */}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
              Your Role
            </Typography>
            <Typography 
              variant="h3" 
              fontWeight="700" 
              color="warning.main"
              sx={{ 
                fontSize: '2rem',
                lineHeight: 1.2
              }}
            >
              {currentUserMember ? getRoleLabel(currentUserMember.role) : 'Member'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ height: 24 }}></Box>
      </CardContent>
    </Card>
  </Grid>
</Grid>
        {/* Project Status Menu */}
        <Menu
          anchorEl={projectMenuAnchor}
          open={Boolean(projectMenuAnchor)}
          onClose={() => setProjectMenuAnchor(null)}
          PaperProps={{
            sx: { 
              borderRadius: 2,
              minWidth: 200,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
            }
          }}
        >
          <MenuItem 
            selected={selectedProjectStatus === 'all'}
            onClick={() => {
              handleProjectStatusSelect('all');
              setProjectMenuAnchor(null);
            }}
            sx={{ py: 1.5 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Typography variant="body2" fontWeight={selectedProjectStatus === 'all' ? 600 : 400}>
                All Projects
              </Typography>
              <Chip label={projectStats.total} size="small" variant="outlined" />
            </Box>
          </MenuItem>
          
          <Divider />
          
          {[
            { status: PROJECT_STATUS.ACTIVE, label: 'Active', color: 'success' as const, count: projectStats.active },
            { status: PROJECT_STATUS.COMPLETED, label: 'Completed', color: 'info' as const, count: projectStats.completed },
            { status: PROJECT_STATUS.ON_HOLD, label: 'On Hold', color: 'warning' as const, count: projectStats.onHold },
            { status: PROJECT_STATUS.PLANNING, label: 'Planning', color: 'default' as const, count: projectStats.planning },
            { status: PROJECT_STATUS.CANCELLED, label: 'Cancelled', color: 'error' as const, count: projectStats.cancelled },
          ].map((item) => (
            <MenuItem 
              key={item.status}
              selected={selectedProjectStatus === item.status}
              onClick={() => {
                handleProjectStatusSelect(item.status);
                setProjectMenuAnchor(null);
              }}
              sx={{ py: 1.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: `${item.color}.main`
                    }}
                  />
                  <Typography variant="body2" fontWeight={selectedProjectStatus === item.status ? 600 : 400}>
                    {item.label}
                  </Typography>
                </Box>
                <Chip 
                  label={item.count} 
                  size="small" 
                  color={item.color}
                  variant={selectedProjectStatus === item.status ? 'filled' : 'outlined'}
                />
              </Box>
            </MenuItem>
          ))}
        </Menu>
        {/* Filtered Projects Section */}
{showProjectList && (
  <Paper 
    sx={{ 
      borderRadius: 4,
      backgroundColor: 'white',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
      mb: 4
    }}
  >
    {/* Header */}
    <Box 
      sx={{ 
        p: { xs: 3, md: 4 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
          {selectedProjectStatus === 'all' ? 'All Projects' : `${getProjectStatusText(selectedProjectStatus as number)} Projects`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          label={selectedProjectStatus === 'all' ? 'All' : getProjectStatusText(selectedProjectStatus as number)}
          color={selectedProjectStatus === 'all' ? 'default' : getProjectStatusColor(selectedProjectStatus as number) as any}
          sx={{ fontWeight: 600 }}
        />
        <IconButton 
          onClick={handleCloseProjectList}
          sx={{ 
            backgroundColor: 'action.hover',
            '&:hover': {
              backgroundColor: 'action.selected'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>
    </Box>

    {/* Projects List */}
    <Box sx={{ p: { xs: 0, md: 2 } }}>
      {filteredProjects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ProjectIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="600">
            No Projects Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            {selectedProjectStatus === 'all' 
              ? 'No projects have been created for this team yet.'
              : `No ${getProjectStatusText(selectedProjectStatus as number).toLowerCase()} projects found.`
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<ProjectIcon />}
            onClick={() => navigate(`/team/${teamId}/projects`)}
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontWeight: '600'
            }}
          >
            Create New Project
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ p: 2 }}>
          {filteredProjects.slice(0, 6).map((project) => (
            <Grid item xs={12} md={6} key={project.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderRadius: 2,
                  backgroundColor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => navigate(`/team/${teamId}/project/${project.id}`)}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        flex: 1,
                        fontWeight: '600',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {project.name}
                    </Typography>
                    <Chip
                      label={getProjectStatusText(project.status)}
                      color={getProjectStatusColor(project.status) as any}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>

                  {project.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {project.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {project.member_count} member{project.member_count !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.task_count} task{project.task_count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredProjects.length > 6 && (
        <Box sx={{ textAlign: 'center', py: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/team/${teamId}/projects`)}
            sx={{ borderRadius: 2 }}
          >
            View All {filteredProjects.length} Projects
          </Button>
        </Box>
      )}
    </Box>
  </Paper>
)}

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Members Section */}
          <Grid item xs={12} lg={8}>
            <Paper 
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <Box 
                sx={{ 
                  p: { xs: 3, md: 4 },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'grey.50'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                      Team Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage your team members and their roles
                    </Typography>
                  </Box>
                  
                  {canManage && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setInviteDialogOpen(true)}
                      sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1,
                        fontWeight: '600',
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        minWidth: 'auto'
                      }}
                    >
                      Invite Member
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Members List */}
              <Box sx={{ p: { xs: 0, md: 2 } }}>
                {members.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <GroupAddIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="600">
                      No Members Yet
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                      Start building your team by inviting members to collaborate.
                    </Typography>
                    {canManage && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setInviteDialogOpen(true)}
                        sx={{ 
                          borderRadius: 3,
                          px: 4,
                          py: 1.5,
                          fontWeight: '600'
                        }}
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
                            px: { xs: 2, md: 3 },
                            py: 2.5,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'grey.50',
                              borderRadius: 2
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
                          
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                                <Typography variant="h6" fontWeight="600">
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
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  {member.user.email}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color={formatLastActive(member.user.last_active) === 'Online' ? 'success.main' : 'text.secondary'}
                                  sx={{ 
                                    fontWeight: formatLastActive(member.user.last_active) === 'Online' ? 600 : 400,
                                  }}
                                >
                                  {formatLastActive(member.user.last_active) === 'Online' 
                                    ? 'Online' 
                                    : `Last active: ${formatLastActive(member.user.last_active)}`
                                  }
                                </Typography>
                              </Box>
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {canUpdateRole(member) && (
                                <Tooltip title="Change Role">
                                  <IconButton
                                    size="small"
                                    onClick={() => openRoleUpdateDialog(member)}
                                    sx={{
                                      backgroundColor: 'primary.50',
                                      color: 'primary.main',
                                      '&:hover': {
                                        backgroundColor: 'primary.100',
                                      }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canRemoveMember(member) && (
                                <Tooltip title="Remove Member">
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={() => openRemoveMemberDialog(member)}
                                    sx={{
                                      backgroundColor: 'error.50',
                                      '&:hover': {
                                        backgroundColor: 'error.100',
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < members.length - 1 && (
                          <Divider variant="inset" component="li" sx={{ mx: { xs: 2, md: 3 } }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Sidebar Section */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Quick Actions */}
              <Paper 
                sx={{ 
                  borderRadius: 4,
                  backgroundColor: 'white',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkspaceIcon color="primary" />
                    Quick Actions
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2 }}>
                  <Button 
                    fullWidth
                    startIcon={<ProjectIcon />}
                    onClick={() => navigate(`/team/${teamId}/projects`)}
                    sx={{ 
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      py: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 1,
                      '&:hover': {
                        backgroundColor: 'primary.50',
                        color: 'primary.main'
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight="600">
                        View Projects
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Browse team projects and tasks
                      </Typography>
                    </Box>
                  </Button>

                  {canManage && (
                    <Button 
                      fullWidth
                      startIcon={<PersonAddIcon />}
                      onClick={() => setInviteDialogOpen(true)}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        py: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 1,
                        '&:hover': {
                          backgroundColor: 'secondary.50',
                          color: 'secondary.main'
                        }
                      }}
                    >
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight="600">
                          Invite Members
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Add new team members
                        </Typography>
                      </Box>
                    </Button>
                  )}

                  <Button 
                    fullWidth
                    startIcon={<SettingsIcon />}
                    onClick={() => navigate(`/team/${teamId}/settings`)}
                    sx={{ 
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      py: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.primary',
                      '&:hover': {
                        backgroundColor: 'warning.50',
                        color: 'warning.main'
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight="600">
                        Team Settings
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Manage team preferences
                      </Typography>
                    </Box>
                  </Button>
                </Box>
              </Paper>

              {/* Team Information */}
              <Paper 
                sx={{ 
                  borderRadius: 4,
                  backgroundColor: 'white',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupsIcon color="primary" />
                    Team Information
                  </Typography>
                </Box>
                
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Created By
                      </Typography>
                      <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        {team.created_by_name}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Created Date
                      </Typography>
                      <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        {formatDate(team.created_at)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Team Size
                      </Typography>
                      <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupsIcon fontSize="small" color="action" />
                        {team.member_count} members
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Total Projects
                      </Typography>
                      <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ProjectIcon fontSize="small" color="action" />
                        {projectStats.total} projects
                      </Typography>
                    </Box>
                  </Box>

                  {/* Leave Team Button */}
                  <Button
                    fullWidth
                    startIcon={<LeaveIcon />}
                    onClick={() => setLeaveTeamDialogOpen(true)}
                    sx={{ 
                      mt: 3,
                      borderRadius: 2,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'error.main',
                      borderColor: 'error.main',
                      '&:hover': {
                        backgroundColor: 'error.50',
                        borderColor: 'error.dark'
                      }
                    }}
                    variant="outlined"
                  >
                    Leave Team
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Invite Member Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => !actionLoading && setInviteDialogOpen(false)} 
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
        
        <DialogContent sx={{ p: 4, mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              placeholder="Enter email address to invite"
              disabled={actionLoading}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  }
                } 
              }}
            />
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                Assign Role
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { value: 2, label: 'Admin', color: 'warning' as const },
                  { value: 3, label: 'Member', color: 'primary' as const },
                  { value: 4, label: 'Guest', color: 'default' as const },
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
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInviteMember} 
            variant="contained"
            disabled={!inviteData.email.trim() || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <EmailIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            {actionLoading ? 'Sending...' : 'Send Invitation'}
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
              borderColor: 'warning.light'
            }}
          >
            This action cannot be undone. The member will lose access to all team resources.
          </Alert>
          
          <Typography>
            Are you sure you want to remove <strong>{memberToRemove?.user.first_name} {memberToRemove?.user.last_name}</strong> from <strong>{team.name}</strong>?
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
              fontWeight: '600'
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

      {/* Update Role Dialog */}
      <Dialog 
        open={roleUpdateDialogOpen} 
        onClose={() => !actionLoading && setRoleUpdateDialogOpen(false)} 
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
            <ShieldIcon />
            Update Member Role
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Typography paragraph sx={{ mb: 3 }}>
            Update role for <strong>{memberToUpdate?.user.first_name} {memberToUpdate?.user.last_name}</strong>:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { 
                value: 2, 
                label: 'Admin', 
                description: 'Can manage members and projects, create and delete content',
                color: 'warning' as const,
                icon: <SettingsIcon />
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
                icon: <ViewIcon />
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
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setRoleUpdateDialogOpen(false)}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateRole}
            variant="contained"
            disabled={actionLoading || newRole === memberToUpdate?.role}
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

      {/* Leave Team Dialog */}
      <Dialog 
        open={leaveTeamDialogOpen} 
        onClose={() => !actionLoading && setLeaveTeamDialogOpen(false)} 
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
            <LeaveIcon />
            Leave Team
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Typography paragraph>
            Are you sure you want to leave <strong>{team.name}</strong>?
          </Typography>
          
          {isOwner ? (
            <Alert 
              severity="error" 
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'error.light'
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                You are the owner of this team!
              </Typography>
              <Typography variant="body2">
                You cannot leave the team as the owner. Please transfer ownership to another member first.
              </Typography>
            </Alert>
          ) : (
            <Alert 
              severity="warning" 
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'warning.light'
              }}
            >
              You will lose access to all team resources and will need to be invited again to rejoin.
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setLeaveTeamDialogOpen(false)}
            disabled={actionLoading}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            Cancel
          </Button>
          {!isOwner && (
            <Button 
              onClick={handleLeaveTeam} 
              variant="contained" 
              color="warning"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <LeaveIcon />}
              sx={{ 
                borderRadius: 2,
                px: 4,
                py: 1,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              {actionLoading ? 'Leaving...' : 'Leave Team'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Team Menu */}
      <Menu
        anchorEl={teamMenuAnchor}
        open={Boolean(teamMenuAnchor)}
        onClose={() => setTeamMenuAnchor(null)}
        PaperProps={{
          sx: { 
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <MenuItem onClick={() => navigate(`/team/${teamId}/settings`)}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Team Settings
        </MenuItem>
        {canManage && (
          <MenuItem onClick={() => setInviteDialogOpen(true)}>
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            Invite Member
          </MenuItem>
        )}
        <MenuItem onClick={() => setLeaveTeamDialogOpen(true)}>
          <ListItemIcon>
            <LeaveIcon fontSize="small" />
          </ListItemIcon>
          Leave Team
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
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
            alignItems: 'center',
            '& .MuiAlert-message': {
              py: 1
            }
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

export default TeamDetail;