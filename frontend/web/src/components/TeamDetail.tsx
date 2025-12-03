import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  Fab,
  Tab,
  Tabs,
  LinearProgress,
  InputAdornment,
  Collapse,
  CardActionArea,
  FormControl,
  InputLabel,
  Select,
  AvatarGroup,
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
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  GroupAdd as GroupAddIcon,
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  Workspaces as WorkspaceIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Refresh as RefreshIcon,
  OnlinePrediction as OnlineIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingIcon,
  Task as TaskIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  Lightbulb as PlanningIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import { projectAPI } from '../shared/services/projectAPI';
import CommonHeader from '../components/CommonHeader';
import CreateProjectDialog from './dialogs/CreateProjectDialog';

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

interface Project {
  id: string;
  name: string;
  description: string;
  status: number;
  progress: number;
  team_name: string;
  member_count: number;
  task_count: number;
  due_date?: string;
  team_members?: any[];
  team_id?: string;
  start_date?: string;
  end_date?: string;
  created_by_name?: string;
  created_at?: string;
}

// Project Status Constants
const PROJECT_STATUS = {
  PLANNING: 1,
  ACTIVE: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  ARCHIVED: 6
};

const PROJECT_STATUS_CONFIG = {
  [PROJECT_STATUS.PLANNING]: {
    label: 'Planning',
    color: 'default',
    icon: <PlanningIcon fontSize="small" />,
    bgColor: 'grey.50',
    textColor: 'grey.700'
  },
  [PROJECT_STATUS.ACTIVE]: {
    label: 'Active',
    color: 'success',
    icon: <PlayIcon fontSize="small" />,
    bgColor: 'success.50',
    textColor: 'success.700'
  },
  [PROJECT_STATUS.ON_HOLD]: {
    label: 'On Hold',
    color: 'warning',
    icon: <PauseIcon fontSize="small" />,
    bgColor: 'warning.50',
    textColor: 'warning.700'
  },
  [PROJECT_STATUS.COMPLETED]: {
    label: 'Completed',
    color: 'info',
    icon: <CheckCircleIcon fontSize="small" />,
    bgColor: 'info.50',
    textColor: 'info.700'
  },
  [PROJECT_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    bgColor: 'error.50',
    textColor: 'error.700'
  },
};

// Enhanced TeamDetail Component
const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced state management
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSort, setMemberSort] = useState<'name' | 'role' | 'joined'>('name');
  const [projectSort, setProjectSort] = useState<'name' | 'status' | 'progress' | 'created_at'>('created_at');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [projectViewMode, setProjectViewMode] = useState<'grid' | 'list'>('grid');

  // Project states
  const [projectStats, setProjectStats] = useState({
    active: 0,
    completed: 0,
    onHold: 0,
    planning: 0,
    cancelled: 0,
    total: 0
  });

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [teamMenuAnchor, setTeamMenuAnchor] = useState<null | HTMLElement>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [leaveTeamDialogOpen, setLeaveTeamDialogOpen] = useState(false);
  const [roleUpdateDialogOpen, setRoleUpdateDialogOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<Member | null>(null);
  
  // Form states
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 3,
  });
  const [newRole, setNewRole] = useState<number>(3);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  // Load all team data
  const loadTeamData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      
      // Load team details
      const teamResponse = await teamAPI.getTeam(teamId!);
      setTeam(teamResponse.data);

      // Load members
      const membersResponse = await teamAPI.getTeamMembers(teamId!);
      setMembers(membersResponse.data);

      // Load projects
      const projectsResponse = await projectAPI.getProjects(teamId!);
      const projectsData = projectsResponse.data;
      setProjects(projectsData);

      // Calculate project stats
      const stats = {
        active: projectsData.filter((p: any) => p.status === PROJECT_STATUS.ACTIVE).length,
        completed: projectsData.filter((p: any) => p.status === PROJECT_STATUS.COMPLETED).length,
        onHold: projectsData.filter((p: any) => p.status === PROJECT_STATUS.ON_HOLD).length,
        planning: projectsData.filter((p: any) => p.status === PROJECT_STATUS.PLANNING).length,
        cancelled: projectsData.filter((p: any) => p.status === PROJECT_STATUS.CANCELLED).length,
        total: projectsData.length
      };
      setProjectStats(stats);
      
    } catch (error: any) {
      console.error('Failed to load team data:', error);
      setError('Failed to load team details');
      setSnackbar({ 
        open: true, 
        message: 'Failed to load team details', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
      setPageLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      setPageLoading(true);
      loadTeamData();
    }
  }, [teamId]);

  // Enhanced helper functions
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
      4: <EditIcon fontSize="small" />,
    };
    return icons[role as keyof typeof icons] || <PersonIcon fontSize="small" />;
  };

  const isUserOnline = (lastActive: string): boolean => {
    if (!lastActive || lastActive === 'null' || lastActive === 'undefined') {
      return false;
    }
    
    try {
      const lastActiveDate = new Date(lastActive);
      const now = new Date();
      const diffMs = now.getTime() - lastActiveDate.getTime();
      const diffMins = Math.floor(diffMs / 1000 / 60);
      return diffMins < 5;
    } catch {
      return false;
    }
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
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

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

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (days: number) => {
    if (days < 0) return 'error';
    if (days < 7) return 'warning';
    return 'success';
  };

  // Enhanced filtering and sorting
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by online status
    if (showOnlineOnly) {
      filtered = filtered.filter(member => isUserOnline(member.user.last_active));
    }

    // Sort members
    filtered = [...filtered].sort((a, b) => {
      switch (memberSort) {
        case 'name':
          return `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`);
        case 'role':
          return a.role - b.role;
        case 'joined':
          return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, memberSort, showOnlineOnly]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort projects
    filtered = [...filtered].sort((a, b) => {
      switch (projectSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status - b.status;
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'created_at':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchQuery, projectSort]);

  const displayProjects = showAllProjects ? filteredAndSortedProjects : filteredAndSortedProjects.slice(0, 6);

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

  // Enhanced action handlers
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
      await loadTeamData();
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

  const handleCreateProject = (project: any) => {
    setSnackbar({
      open: true,
      message: 'Project created successfully!',
      severity: 'success'
    });
    setCreateProjectDialogOpen(false);
    loadTeamData();
  };

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
      await loadTeamData();
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
      await loadTeamData();
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

  // Project menu handlers
  const handleProjectMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setProjectMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
    setSelectedProject(null);
  };

  const handleEditProject = () => {
    if (selectedProject && teamId) {
      navigate(`/team/${teamId}/project/${selectedProject.id}/edit`);
      handleProjectMenuClose();
    }
  };

  const handleProjectSettings = () => {
    if (selectedProject && teamId) {
      navigate(`/team/${teamId}/project/${selectedProject.id}/settings`);
      handleProjectMenuClose();
    }
  };

  // Dialog handlers
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
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Tooltip title="Refresh">
        <IconButton 
          onClick={loadTeamData}
          disabled={refreshing}
          sx={{ 
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'grey.50',
            }
          }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
          <Tooltip title="View All Projects">
      <IconButton 
        onClick={() => navigate(`/team/${teamId}/projects`)}
        sx={{ 
          backgroundColor: 'info.50',
          color: 'info.main',
          '&:hover': {
            backgroundColor: 'info.100',
          }
        }}
      >
        <FolderIcon />
      </IconButton>
    </Tooltip>

      {canManage && (
        <Tooltip title="Create Project">
          <IconButton 
            onClick={() => setCreateProjectDialogOpen(true)}
            sx={{ 
              backgroundColor: 'primary.50',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.100',
              }
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
        
      )}
      

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

  // Calculate online members count
  const onlineMembersCount = members.filter(member => isUserOnline(member.user.last_active)).length;

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

        {/* Enhanced Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Team Members Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                '&:last-child': { pb: isMobile ? 1.5 : 2 }
              }}>
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <GroupsIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="primary.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {team.member_count}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Team Members
                  </Typography>
                </Box>

                {/* Online Status - Top Right */}
                <Box sx={{ 
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <OnlineIcon sx={{ 
                    fontSize: isMobile ? 14 : 16, 
                    color: 'success.main' 
                  }} />
                  <Typography 
                    variant="caption" 
                    color="success.main"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {onlineMembersCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Projects Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                '&:last-child': { pb: isMobile ? 1.5 : 2 }
              }}>
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'secondary.50',
                  color: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <ProjectIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="secondary.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {projectStats.total}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Total Projects
                  </Typography>
                </Box>

                {/* Active Projects Status - Top Right */}
                <Box sx={{ 
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 0.5
                }}>
                  <Chip 
                    label={`${projectStats.active} active`} 
                    size="small" 
                    color="success" 
                    variant="filled"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      minWidth: 'auto',
                      px: 0.5
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Projects Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                '&:last-child': { pb: isMobile ? 1.5 : 2 }
              }}>
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'success.50',
                  color: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <TrendingIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="success.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {projectStats.active}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Active Projects
                  </Typography>
                </Box>

                {/* Planning Status - Top Right */}
                <Box sx={{ 
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 0.5
                }}>
                  <Chip 
                    label={`${projectStats.planning} planning`} 
                    size="small" 
                    color="default" 
                    variant="outlined"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      minWidth: 'auto',
                      px: 0.5
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Your Role Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                '&:last-child': { pb: isMobile ? 1.5 : 2 }
              }}>
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'warning.50',
                  color: 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <ShieldIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="warning.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {currentUserMember ? getRoleLabel(currentUserMember.role) : 'Member'}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Your Role
                  </Typography>
                </Box>

                {/* Manager Badge - Top Right */}
                {canManage && (
                  <Box sx={{ 
                    position: 'absolute',
                    top: 12,
                    right: 12
                  }}>
                    <Chip 
                      label="Manager" 
                      size="small" 
                      color="primary" 
                      variant="filled"
                      sx={{ 
                        height: 20, 
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        minWidth: 'auto',
                        px: 0.5
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Enhanced Tabs Navigation */}
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
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
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
              icon={<GroupsIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label={`Members (${members.length})`} 
            />
            <Tab 
              icon={<ProjectIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label={`Projects (${projects.length})`} 
            />
            <Tab 
              icon={<WorkspaceIcon sx={{ fontSize: 20, mr: 1 }} />} 
              iconPosition="start" 
              label="Team Overview" 
            />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {/* Members Tab */}
            {activeTab === 0 && (
              <Box>
                {/* Enhanced Members Header with Search and Filters */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 4
                }}>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                      Team Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filteredAndSortedMembers.length} member{filteredAndSortedMembers.length !== 1 ? 's' : ''} • {onlineMembersCount} online
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <TextField
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2,
                        } 
                      }}
                      size="small"
                    />

                    {/* Online Filter */}
                    <Tooltip title={showOnlineOnly ? "Show all members" : "Show online only"}>
                      <IconButton
                        onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                        sx={{
                          backgroundColor: showOnlineOnly ? 'success.50' : 'transparent',
                          color: showOnlineOnly ? 'success.main' : 'text.secondary',
                          borderRadius: 2
                        }}
                      >
                        <OnlineIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Sort Menu */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Sort by</InputLabel>
                      <Select
                        value={memberSort}
                        label="Sort by"
                        onChange={(e) => setMemberSort(e.target.value as any)}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="role">Role</MenuItem>
                        <MenuItem value="joined">Joined Date</MenuItem>
                      </Select>
                    </FormControl>

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
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Invite Member
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Enhanced Members List */}
                {filteredAndSortedMembers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="500">
                      {searchQuery || showOnlineOnly ? 'No members found' : 'No Members Yet'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                      {searchQuery || showOnlineOnly 
                        ? 'Try adjusting your search or filters to find what you\'re looking for.'
                        : 'Start building your team by inviting members to collaborate.'
                      }
                    </Typography>
                    {canManage && !searchQuery && !showOnlineOnly && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setInviteDialogOpen(true)}
                        sx={{ 
                          borderRadius: 2,
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
                  <Grid container spacing={2}>
                    {filteredAndSortedMembers.map((member) => (
                      <Grid item xs={12} sm={6} md={4} key={member.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 3,
                            backgroundColor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s ease',
                            height: '100%',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                      <CardContent sx={{ p: 3, position: 'relative' }}>
                        {/* Online Status Badge - CONDITIONAL */}
                        {isUserOnline(member.user.last_active) && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: 'success.main',
                              border: '2px solid white',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          />
                        )}

                        {/* Member Avatar and Basic Info */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                          {/* Enhanced Online Status Badge - CONDITIONAL */}
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ 
                              vertical: 'bottom', 
                              horizontal: 'right' 
                            }}
                            variant="dot"
                            invisible={!isUserOnline(member.user.last_active)} // ← THIS IS THE KEY FIX
                            sx={{
                              '& .MuiBadge-badge': {
                                backgroundColor: '#4CAF50',
                                color: '#4CAF50',
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                border: '3px solid white',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                animation: 'pulse 2s infinite',
                                '&::after': {
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  animation: 'ripple 1.2s infinite ease-in-out',
                                  border: '1px solid currentColor',
                                  content: '""',
                                }
                              }
                            }}
                          >
                            <Avatar 
                              sx={{ 
                                width: 60, 
                                height: 60,
                                bgcolor: 'primary.main',
                                fontSize: '1.25rem',
                                fontWeight: '600'
                              }}
                            >
                              {member.user.first_name?.[0]}{member.user.last_name?.[0]}
                            </Avatar>
                          </Badge>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }} noWrap>
                              {member.user.first_name} {member.user.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
                              {member.user.email}
                            </Typography>
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
                                sx={{ ml: 1, fontWeight: 600 }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Member Status and Actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography 
                            variant="caption" 
                            color={isUserOnline(member.user.last_active) ? 'success.main' : 'text.secondary'}
                            sx={{ 
                              fontWeight: isUserOnline(member.user.last_active) ? 600 : 400,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            {isUserOnline(member.user.last_active) ? (
                              <>
                                <OnlineIcon sx={{ fontSize: 14 }} />
                                Online
                              </>
                            ) : (
                              `Last active: ${formatLastActive(member.user.last_active)}`
                            )}
                          </Typography>

                          {(canUpdateRole(member) || canRemoveMember(member)) && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToUpdate(member);
                                setTeamMenuAnchor(e.currentTarget);
                              }}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'action.hover'
                                }
                              }}
                            >
                              <MoreIcon />
                            </IconButton>
                          )}
                        </Box>
                      </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Projects Tab */}
            {activeTab === 1 && (
              <Box>
                {/* Enhanced Projects Header */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 4
                }}>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                      Team Projects
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {displayProjects.length} project{displayProjects.length !== 1 ? 's' : ''} • {projectStats.active} active
                      {!showAllProjects && filteredAndSortedProjects.length > 6 && ` (showing 6 of ${filteredAndSortedProjects.length})`}
                    </Typography>
                  </Box>
                  
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <TextField
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2,
                        } 
                      }}
                      size="small"
                    />

                    {/* Sort Menu */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Sort by</InputLabel>
                      <Select
                        value={projectSort}
                        label="Sort by"
                        onChange={(e) => setProjectSort(e.target.value as any)}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="created_at">Date Created</MenuItem>
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="status">Status</MenuItem>
                        <MenuItem value="progress">Progress</MenuItem>
                      </Select>
                    </FormControl>

                    {/* View Mode Toggle */}
                    <Box sx={{ 
                      display: 'flex', 
                      backgroundColor: 'grey.50',
                      borderRadius: 2,
                      p: 0.5
                    }}>
                      <Tooltip title="Grid View">
                        <IconButton 
                          size="small"
                          onClick={() => setProjectViewMode('grid')}
                          sx={{ 
                            borderRadius: 1.5,
                            backgroundColor: projectViewMode === 'grid' ? 'white' : 'transparent',
                            boxShadow: projectViewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          <GridIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="List View">
                        <IconButton 
                          size="small"
                          onClick={() => setProjectViewMode('list')}
                          sx={{ 
                            borderRadius: 1.5,
                            backgroundColor: projectViewMode === 'list' ? 'white' : 'transparent',
                            boxShadow: projectViewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          <ListIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {canManage && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateProjectDialogOpen(true)}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          textTransform: 'none',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        New Project
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Enhanced Projects Grid/List */}
                {displayProjects.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <ProjectIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="500">
                      {searchQuery ? 'No projects found' : 'No Projects Yet'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                      {searchQuery 
                        ? 'Try adjusting your search to find what you\'re looking for.'
                        : 'Create your first project to start organizing your team\'s work.'
                      }
                    </Typography>
                    {canManage && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateProjectDialogOpen(true)}
                        sx={{ 
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          fontWeight: '600'
                        }}
                      >
                        Create New Project
                      </Button>
                    )}
                  </Box>
                ) : projectViewMode === 'grid' ? (
                  <Grid container spacing={3}>
                    {displayProjects.map((project) => (
                      <Grid item xs={12} sm={6} md={4} key={project.id}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            borderRadius: 3,
                            backgroundColor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                          <CardContent sx={{ 
                            p: 3, 
                            flex: 1, 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:last-child': { pb: 3 }
                          }}>
                            {/* Project Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Chip
                                label={getProjectStatusText(project.status)}
                                color={getProjectStatusColor(project.status) as any}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                              <IconButton
                                size="small"
                                onClick={(e) => handleProjectMenuOpen(e, project)}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'action.selected'
                                  }
                                }}
                              >
                                <MoreIcon />
                              </IconButton>
                            </Box>

                            {/* Project Title and Description */}
                            <Box 
                              onClick={() => navigate(`/team/${teamId}/project/${project.id}`)}
                              sx={{ cursor: 'pointer', flex: 1 }}
                            >
                              <Typography 
                                variant="h6" 
                                component="h2" 
                                sx={{ 
                                  mb: 2,
                                  fontWeight: '700',
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  minHeight: '2.6em'
                                }}
                              >
                                {project.name}
                              </Typography>

                              {project.description ? (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    mb: 3,
                                    lineHeight: 1.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {project.description}
                                </Typography>
                              ) : (
                                <Box sx={{ mb: 3, height: '1.5rem' }} />
                              )}

                              {/* Progress Bar */}
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight="500">
                                    Progress
                                  </Typography>
                                  <Typography variant="caption" fontWeight="600" color="primary.main">
                                    {project.progress || 0}%
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={project.progress || 0} 
                                  sx={{ 
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 3,
                                    }
                                  }}
                                />
                              </Box>

                              {/* Timeline */}
                              <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight="500">
                                    Timeline
                                  </Typography>
                                  {project.end_date && (
                                    <Chip
                                      label={`${getDaysRemaining(project.end_date)} days left`}
                                      size="small"
                                      color={getProgressColor(getDaysRemaining(project.end_date)) as any}
                                      variant="outlined"
                                      sx={{ fontWeight: '500' }}
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <CalendarIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {project.start_date ? formatDate(project.start_date) : 'Not set'} - {project.end_date ? formatDate(project.end_date) : 'Not set'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            {/* Footer Stats */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              pt: 2,
                              borderTop: '1px solid',
                              borderColor: 'divider'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GroupsIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="500">
                                  {project.member_count}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TaskIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="500">
                                  {project.task_count}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {project.created_by_name || 'Unknown'}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  /* Enhanced List View */
                  <Paper 
                    sx={{ 
                      borderRadius: 3,
                      backgroundColor: 'white',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden'
                    }}
                  >
                    {displayProjects.map((project, index) => (
                      <Box key={project.id}>
                        <Box 
                          sx={{ 
                            p: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'grey.50'
                            }
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => navigate(`/team/${teamId}/project/${project.id}`)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
                                {project.name}
                              </Typography>
                              <Chip
                                label={getProjectStatusText(project.status)}
                                color={getProjectStatusColor(project.status) as any}
                                size="small"
                                sx={{ fontWeight: '600' }}
                              />
                            </Box>
                            
                            {project.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {project.description}
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {project.start_date ? formatDate(project.start_date) : 'Not set'} - {project.end_date ? formatDate(project.end_date) : 'Not set'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GroupsIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {project.member_count} members
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TaskIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {project.task_count} tasks
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="500">
                                  {project.progress || 0}% complete
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          <IconButton
                            onClick={(e) => handleProjectMenuOpen(e, project)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.selected'
                              }
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>
                        {index < displayProjects.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </Paper>
                )}

                {/* View All Projects Button */}
                {filteredAndSortedProjects.length > 6 && (
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      sx={{ borderRadius: 2 }}
                    >
                      {showAllProjects ? `Show Less` : `View All ${filteredAndSortedProjects.length} Projects`}
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Team Overview Tab */}
            {activeTab === 2 && (
              <Grid container spacing={4}>
                {/* Team Information */}
                <Grid item xs={12} lg={8}>
                  <Card sx={{ borderRadius: 3, mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkspaceIcon color="primary" />
                        Team Information
                      </Typography>
                      
                      <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                              Created By
                            </Typography>
                            <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" color="action" />
                              {team.created_by_name}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                              Created Date
                            </Typography>
                            <Typography variant="body2" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CalendarIcon fontSize="small" color="action" />
                              {formatDate(team.created_at)}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                              Team Description
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                              {team.description || 'No description provided'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                              Your Permissions
                            </Typography>
                            <Chip
                              label={canManage ? 'Team Manager' : 'Team Member'}
                              color={canManage ? 'primary' : 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SettingsIcon color="primary" />
                        Quick Actions
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={6} md={4}>
                          <CardActionArea 
                            onClick={() => navigate(`/team/${teamId}/projects`)}
                            sx={{ borderRadius: 2 }}
                          >
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                              <ProjectIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                              <Typography variant="body2" fontWeight="600">
                                View Projects
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Browse all projects
                              </Typography>
                            </Box>
                          </CardActionArea>
                        </Grid>

                        {canManage && (
                          <Grid item xs={12} sm={6} md={4}>
                            <CardActionArea 
                              onClick={() => setCreateProjectDialogOpen(true)}
                              sx={{ borderRadius: 2 }}
                            >
                              <Box sx={{ p: 3, textAlign: 'center' }}>
                                <RocketIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                                <Typography variant="body2" fontWeight="600">
                                  Create Project
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Start new project
                                </Typography>
                              </Box>
                            </CardActionArea>
                          </Grid>
                        )}

                        {canManage && (
                          <Grid item xs={12} sm={6} md={4}>
                            <CardActionArea 
                              onClick={() => setInviteDialogOpen(true)}
                              sx={{ borderRadius: 2 }}
                            >
                              <Box sx={{ p: 3, textAlign: 'center' }}>
                                <PersonAddIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                <Typography variant="body2" fontWeight="600">
                                  Invite Members
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Add team members
                                </Typography>
                              </Box>
                            </CardActionArea>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Team Stats Sidebar */}
                <Grid item xs={12} lg={4}>
                  <Card sx={{ borderRadius: 3, mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingIcon color="primary" />
                        Team Statistics
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Member Distribution
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip label={`${members.filter(m => m.role === 1).length} Owners`} size="small" color="error" variant="outlined" />
                            <Chip label={`${members.filter(m => m.role === 2).length} Admins`} size="small" color="warning" variant="outlined" />
                            <Chip label={`${members.filter(m => m.role === 3).length} Members`} size="small" color="primary" variant="outlined" />
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Project Status
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip label={`${projectStats.active} Active`} size="small" color="success" variant="outlined" />
                            <Chip label={`${projectStats.completed} Completed`} size="small" color="info" variant="outlined" />
                            <Chip label={`${projectStats.planning} Planning`} size="small" color="default" variant="outlined" />
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Activity
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {onlineMembersCount} members online now
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Leave Team Section */}
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LeaveIcon color="error" />
                        Team Actions
                      </Typography>
                      
                      <Button
                        fullWidth
                        startIcon={<LeaveIcon />}
                        onClick={() => setLeaveTeamDialogOpen(true)}
                        sx={{ 
                          mt: 2,
                          borderRadius: 2,
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: '600',
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

                      {isOwner && (
                        <Button
                          fullWidth
                          startIcon={<SettingsIcon />}
                          onClick={() => navigate(`/team/${teamId}/settings`)}
                          sx={{ 
                            mt: 1,
                            borderRadius: 2,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                          variant="outlined"
                        >
                          Team Settings
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Enhanced Dialogs */}
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
        
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
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

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createProjectDialogOpen}
        onClose={() => setCreateProjectDialogOpen(false)}
        onProjectCreated={handleCreateProject}
        teamId={teamId!}
      />

      {/* Member Management Menu */}
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
        <MenuItem onClick={() => {
          if (memberToUpdate) {
            openRoleUpdateDialog(memberToUpdate);
          }
          setTeamMenuAnchor(null);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Change Role
        </MenuItem>
        <MenuItem onClick={() => {
          if (memberToUpdate) {
            openRemoveMemberDialog(memberToUpdate);
          }
          setTeamMenuAnchor(null);
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error.main">Remove Member</Typography>
        </MenuItem>
      </Menu>

      {/* Project Management Menu */}
      <Menu
        anchorEl={projectMenuAnchor}
        open={Boolean(projectMenuAnchor)}
        onClose={handleProjectMenuClose}
        PaperProps={{
          sx: { 
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <MenuItem onClick={handleEditProject}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Project
        </MenuItem>
        <MenuItem onClick={handleProjectSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Project Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleProjectMenuClose}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error.main">Delete Project</Typography>
        </MenuItem>
      </Menu>

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
                icon: <EditIcon />
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
          aria-label="create project"
          onClick={() => setCreateProjectDialogOpen(true)}
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
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default TeamDetail;