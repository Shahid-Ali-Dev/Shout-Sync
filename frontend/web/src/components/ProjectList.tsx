import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  CircularProgress,
  alpha,
  ListItemIcon,
  Fab,
  Tooltip,
  Badge,
  Divider,
  Avatar,
  AvatarGroup,
  InputAdornment,
  CardActionArea,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Groups as GroupsIcon,
  Assignment as TaskIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Dashboard as DashboardIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Archive as ArchiveIcon,
  Rocket as RocketIcon,
  Lightbulb as PlanningIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { projectAPI } from '../shared/services/projectAPI';
import { Project, ProjectStatus } from '../shared/types/projectTypes';
import CommonHeader from '../components/CommonHeader';

// Enhanced Project Status Configuration
const PROJECT_STATUS_CONFIG: Record<number, ProjectStatusConfig> = {
  [ProjectStatus.PLANNING]: {
    label: 'Planning',
    color: 'default',
    icon: <PlanningIcon fontSize="small" />,
    bgColor: 'grey.50',
    textColor: 'grey.700'
  },
  [ProjectStatus.ACTIVE]: {
    label: 'Active',
    color: 'success',
    icon: <PlayIcon fontSize="small" />,
    bgColor: 'success.50',
    textColor: 'success.700'
  },
  [ProjectStatus.ON_HOLD]: {
    label: 'On Hold',
    color: 'warning',
    icon: <PauseIcon fontSize="small" />,
    bgColor: 'warning.50',
    textColor: 'warning.700'
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    color: 'info',
    icon: <CheckCircleIcon fontSize="small" />,
    bgColor: 'info.50',
    textColor: 'info.700'
  },
  [ProjectStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    bgColor: 'error.50',
    textColor: 'error.700'
  },
  [ProjectStatus.ARCHIVED]: {
    label: 'Archived',
    color: 'default',
    icon: <ArchiveIcon fontSize="small" />,
    bgColor: 'grey.100',
    textColor: 'grey.600'
  },
};

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  planning: number;
  onHold: number;
  cancelled: number;
  archived: number;
}

interface ProjectStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
  bgColor: string;
  textColor: string;
}

const ProjectList: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Enhanced state management
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'start_date' | 'status' | 'progress'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [actionLoading, setActionLoading] = useState(false);

  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: ProjectStatus.PLANNING,
    team: teamId,
  });

  // Enhanced project statistics
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    planning: 0,
    onHold: 0,
    cancelled: 0,
    archived: 0,
  });

  // Enhanced project loading with progress calculation
  const loadProjects = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      const response = await projectAPI.getProjects(teamId);
      const projectsData: Project[] = response.data;
      
      // Calculate project progress and enhance data
      const enhancedProjects = projectsData.map(project => ({
        ...project,
        progress: calculateProjectProgress(project),
        daysRemaining: getDaysRemaining(project.end_date),
      }));
      
      setProjects(enhancedProjects);
      
      // Calculate comprehensive statistics
      const stats = {
        total: enhancedProjects.length,
        active: enhancedProjects.filter(p => p.status === ProjectStatus.ACTIVE).length,
        completed: enhancedProjects.filter(p => p.status === ProjectStatus.COMPLETED).length,
        planning: enhancedProjects.filter(p => p.status === ProjectStatus.PLANNING).length,
        onHold: enhancedProjects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
        cancelled: enhancedProjects.filter(p => p.status === ProjectStatus.CANCELLED).length,
        archived: enhancedProjects.filter(p => p.status === ProjectStatus.ARCHIVED).length,
      };
      setProjectStats(stats);
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load projects', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate project progress based on tasks and timeline
  const calculateProjectProgress = (project: Project): number => {
    // Simple implementation - you can enhance this with actual task completion data
    if (project.status === ProjectStatus.COMPLETED) return 100;
    if (project.status === ProjectStatus.CANCELLED) return 0;
    
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = new Date().getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(Math.round((elapsed / totalDuration) * 100), 95);
  };

  useEffect(() => {
    if (teamId) {
      loadProjects();
    }
  }, [teamId]);

  // Enhanced filtering and sorting
  useEffect(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'progress':
          aValue = (a as any).progress || 0;
          bValue = (b as any).progress || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, statusFilter, sortBy, sortOrder]);

  // Enhanced project creation with validation
  const handleCreateProject = async () => {
    if (!teamId) return;

    // Validation
    if (!projectData.name.trim()) {
      setSnackbar({ 
        open: true, 
        message: 'Project name is required', 
        severity: 'warning' 
      });
      return;
    }
    

    const startDate = new Date(projectData.start_date);
    const endDate = new Date(projectData.end_date);
    
    if (endDate <= startDate) {
      setSnackbar({ 
        open: true, 
        message: 'End date must be after start date', 
        severity: 'warning' 
      });
      return;
    }

    try {
      setActionLoading(true);
      const formattedData = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        start_date: projectData.start_date ? new Date(projectData.start_date).toISOString() : new Date().toISOString(),
        end_date: projectData.end_date ? new Date(projectData.end_date).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: projectData.status,
        team: teamId,
      };

      await projectAPI.createProject(teamId, formattedData);
      
      setSnackbar({ 
        open: true, 
        message: 'Project created successfully', 
        severity: 'success' 
      });
      setCreateDialogOpen(false);
      setProjectData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: ProjectStatus.PLANNING,
        team: teamId,
      });
      await loadProjects();
    } catch (error: any) {
      console.error('Project creation failed:', error);
      
      let message = 'Failed to create project';
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response?.status === 403) {
        message = 'You do not have permission to create projects. Please contact your team admin.';
      }
      
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Enhanced project actions
  const handleProjectMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setProjectMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
    setSelectedProject(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject || !teamId) return;

    if (!selectedProject.name || deleteConfirmText !== selectedProject.name) {
      setSnackbar({ 
        open: true, 
        message: 'Project name does not match', 
        severity: 'error' 
      });
      return;
    }

    try {
      setDeleteLoading(true);
      await projectAPI.deleteProject(teamId, selectedProject.id);
      setSnackbar({ 
        open: true, 
        message: 'Project deleted successfully', 
        severity: 'success' 
      });
      setDeleteDialogOpen(false);
      handleProjectMenuClose();
      await loadProjects();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      const message = error.response?.data?.error || 'Failed to delete project';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSettingsClick = () => {
    if (selectedProject && teamId) {
      navigate(`/team/${teamId}/project/${selectedProject.id}/settings`);
      handleProjectMenuClose();
    }
  };

  const handleEditClick = () => {
    if (selectedProject && teamId) {
      navigate(`/team/${teamId}/project/${selectedProject.id}/edit`);
      handleProjectMenuClose();
    }
  };

  const handleDuplicateProject = async () => {
    if (!selectedProject || !teamId) return;

    try {
      setActionLoading(true);
      const duplicateData = {
        name: `${selectedProject.name} (Copy)`,
        description: selectedProject.description,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: ProjectStatus.PLANNING,
        team: teamId,
      };

      await projectAPI.createProject(teamId, duplicateData);
      setSnackbar({ 
        open: true, 
        message: 'Project duplicated successfully', 
        severity: 'success' 
      });
      handleProjectMenuClose();
      await loadProjects();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to duplicate project';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getProgressVariant = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'primary';
    if (progress >= 50) return 'secondary';
    if (progress >= 25) return 'warning';
    return 'error';
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
      
      <Tooltip title="Refresh Projects">
        <IconButton 
          onClick={loadProjects}
          disabled={loading}
          sx={{ 
            backgroundColor: 'secondary.50',
            color: 'secondary.main',
            '&:hover': {
              backgroundColor: 'secondary.100',
            }
          }}
        >
          <RefreshIcon />
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
            Loading projects...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Enhanced Header */}
      <CommonHeader 
        showBackButton
        backButtonPath={`/team/${teamId}`}
        title="Projects"
        subtitle="Manage and organize your team's work"
        customActions={headerActions}
        variant="page"
      />

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Enhanced Project Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { 
              key: 'total', 
              label: 'Total Projects', 
              value: projectStats.total, 
              color: 'primary' as const,
              icon: <FolderIcon sx={{ fontSize: 32 }} />,
              description: 'All projects'
            },
            { 
              key: 'active', 
              label: 'Active', 
              value: projectStats.active, 
              color: 'success' as const,
              icon: <PlayIcon sx={{ fontSize: 32 }} />,
              description: 'In progress'
            },
            { 
              key: 'completed', 
              label: 'Completed', 
              value: projectStats.completed, 
              color: 'info' as const,
              icon: <CheckCircleIcon sx={{ fontSize: 32 }} />,
              description: 'Finished'
            },
            { 
              key: 'planning', 
              label: 'Planning', 
              value: projectStats.planning, 
              color: 'default' as const,
              icon: <PlanningIcon sx={{ fontSize: 32 }} />,
              description: 'In planning'
            },
            { 
              key: 'onHold', 
              label: 'On Hold', 
              value: projectStats.onHold, 
              color: 'warning' as const,
              icon: <PauseIcon sx={{ fontSize: 32 }} />,
              description: 'Paused'
            },
            { 
              key: 'cancelled', 
              label: 'Cancelled', 
              value: projectStats.cancelled, 
              color: 'error' as const,
              icon: <CancelIcon sx={{ fontSize: 32 }} />,
              description: 'Cancelled'
            },
          ].map((stat) => (
            <Grid item xs={6} sm={4} md={2} key={stat.key}>
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
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.12)'
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
                      p: 2.5,
                      borderRadius: 3, 
                      backgroundColor: `${stat.color}.50`,
                      color: `${stat.color}.main`,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 70,
                      height: 70,
                    }}>
                      {stat.icon}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="700" color={`${stat.color}.main`}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Enhanced Controls Bar */}
        <Paper 
          sx={{ 
            borderRadius: 3,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid',
            borderColor: 'divider',
            p: 3,
            mb: 4
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            {/* Search and Filters */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
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
                  minWidth: 250,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
                size="small"
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as number | 'all')}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
                    <MenuItem key={status} value={parseInt(status)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {config.icon}
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value as any)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="created_at">Date Created</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="start_date">Start Date</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="progress">Progress</MenuItem>
                </Select>
              </FormControl>

              <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
                <IconButton 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  sx={{ 
                    backgroundColor: 'action.hover',
                    borderRadius: 2
                  }}
                >
                  <SortIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* View Controls and Create Button */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                backgroundColor: 'grey.50',
                borderRadius: 2,
                p: 0.5
              }}>
                <Tooltip title="Grid View">
                  <IconButton 
                    size="small"
                    onClick={() => setViewMode('grid')}
                    sx={{ 
                      borderRadius: 1.5,
                      backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
                      boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <GridIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="List View">
                  <IconButton 
                    size="small"
                    onClick={() => setViewMode('list')}
                    sx={{ 
                      borderRadius: 1.5,
                      backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
                      boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <ListIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
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
            </Box>
          </Box>
        </Paper>

        {/* Results Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredProjects.length} of {projects.length} projects
          </Typography>
          {searchQuery && (
            <Chip 
              label={`Search: "${searchQuery}"`} 
              size="small" 
              onDelete={() => setSearchQuery('')}
            />
          )}
        </Box>

        {/* Enhanced Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <Paper sx={{ 
            p: 8, 
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <FolderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom fontWeight="600">
              No Projects Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Create your first project to start organizing your team\'s work.'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              Create New Project
            </Button>
          </Paper>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={3}>
            {filteredProjects.map((project) => (
              <Grid item xs={12} sm={6} lg={4} key={project.id}>
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
                  {/* Use CardActionArea only for the clickable area, not the entire card */}
                  <CardContent sx={{ 
                    p: 3, 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:last-child': { pb: 3 }
                  }}>
                    {/* Header with Status and Menu */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip
                        icon={PROJECT_STATUS_CONFIG[project.status]?.icon}
                        label={PROJECT_STATUS_CONFIG[project.status]?.label}
                        color={PROJECT_STATUS_CONFIG[project.status]?.color}
                        size="small"
                        sx={{ 
                          fontWeight: '600',
                          borderRadius: 1.5,
                          backgroundColor: PROJECT_STATUS_CONFIG[project.status]?.bgColor,
                          color: PROJECT_STATUS_CONFIG[project.status]?.textColor,
                          border: 'none'
                        }}
                      />
                      {/* Remove this duplicate Chip - keeping only the menu button */}
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

                    {/* Project Title - Make this the main clickable area */}
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

                      {/* Project Description */}
                      {project.description && (
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
                            flex: 1
                          }}
                        >
                          {project.description}
                        </Typography>
                      )}

                      {/* Progress Bar */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            Progress
                          </Typography>
                          <Typography variant="caption" fontWeight="600" color="primary.main">
                            {(project as any).progress || 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: '100%', 
                          height: 6, 
                          backgroundColor: 'grey.200', 
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <Box 
                            sx={{ 
                              height: '100%', 
                              backgroundColor: 'primary.main',
                              width: `${(project as any).progress || 0}%`,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Progress and Dates */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            Timeline
                          </Typography>
                          <Chip
                            label={`${getDaysRemaining(project.end_date)} days left`}
                            size="small"
                            color={getProgressColor(getDaysRemaining(project.end_date)) as any}
                            variant="outlined"
                            sx={{ fontWeight: '500' }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CalendarIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
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
                          {project.created_by_name}
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
            {filteredProjects.map((project, index) => (
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
                  onClick={() => navigate(`/team/${teamId}/project/${project.id}`)}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
                        {project.name}
                      </Typography>
                      <Chip
                        icon={PROJECT_STATUS_CONFIG[project.status]?.icon}
                        label={PROJECT_STATUS_CONFIG[project.status]?.label}
                        color={PROJECT_STATUS_CONFIG[project.status]?.color}
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
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
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
                          {(project as any).progress || 0}% complete
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
                {index < filteredProjects.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        )}

        {/* Enhanced Create Project Dialog with all status options */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)} 
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
              <RocketIcon />
              Create New Project
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                label="Project Name"
                required
                fullWidth
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                placeholder="Enter project name"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    }
                  } 
                }}
              />
              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                value={projectData.description}
                onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                placeholder="Describe your project goals and objectives"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    }
                  } 
                }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={projectData.start_date}
                  onChange={(e) => setProjectData({ ...projectData, start_date: e.target.value })}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                    } 
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={projectData.end_date}
                  onChange={(e) => setProjectData({ ...projectData, end_date: e.target.value })}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                    } 
                  }}
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>Initial Status</InputLabel>
                <Select
                  value={projectData.status}
                  label="Initial Status"
                  onChange={(e) => setProjectData({ ...projectData, status: e.target.value as number })}
                  sx={{ borderRadius: 2 }}
                >
                  {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
                    <MenuItem key={status} value={parseInt(status)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {config.icon}
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 4, gap: 2 }}>
            <Button 
              onClick={() => setCreateDialogOpen(false)}
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
              onClick={handleCreateProject} 
              variant="contained"
              disabled={!projectData.name || !projectData.start_date || !projectData.end_date || actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <AddIcon />}
              sx={{ 
                borderRadius: 2,
                px: 4,
                py: 1,
                textTransform: 'none',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              {actionLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enhanced Project Menu */}
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
          <MenuItem 
            onClick={handleEditClick}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Edit Project
            </Typography>
          </MenuItem>
          
          <MenuItem 
            onClick={handleSettingsClick}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Project Settings
            </Typography>
          </MenuItem>

          <MenuItem 
            onClick={handleDuplicateProject}
            disabled={actionLoading}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <ShareIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              {actionLoading ? 'Duplicating...' : 'Duplicate Project'}
            </Typography>
          </MenuItem>

          <Divider />

          <MenuItem 
            onClick={handleDeleteClick}
            sx={{ 
              py: 1.5,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.50',
              }
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Delete Project
            </Typography>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)} 
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
              Delete Project
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
                mt: 1
              }}
            >
              This action cannot be undone. This will permanently delete the project and all associated tasks, subtasks, and data.
            </Alert>
            
            <Typography variant="body1" paragraph>
              Please type <strong>{selectedProject?.name || 'the project name'}</strong> to confirm deletion.
            </Typography>
            
            <TextField
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${selectedProject?.name || 'project name'}" to confirm`}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  '&:focus-within fieldset': {
                    borderColor: 'error.main',
                    borderWidth: 2
                  }
                }
              }}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 4, gap: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
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
              onClick={handleDeleteConfirm}
              disabled={!selectedProject?.name || deleteConfirmText !== selectedProject?.name || deleteLoading}
              variant="contained"
              color="error"
              startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
              sx={{ 
                borderRadius: 2,
                px: 4,
                py: 1,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enhanced Snackbar */}
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
        {isMobile && (
          <Fab
            color="primary"
            aria-label="create project"
            onClick={() => setCreateDialogOpen(true)}
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
      </Container>
    </Box>
  );
};

export default ProjectList;