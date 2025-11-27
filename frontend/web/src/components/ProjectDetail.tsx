import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Tabs,
  Tab,
  Chip,
  Grid,
  Card,
  CardContent,
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
  Avatar,
  AvatarGroup,
  Badge,
  Tooltip,
  Fab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CardActionArea,
  useTheme,
  useMediaQuery,
  LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Groups as GroupsIcon,
  Assignment as TaskIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Comment as CommentIcon,
  Notifications as NotificationIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  Archive as ArchiveIcon,
  Lightbulb as PlanningIcon,
  TrendingUp as ProgressIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Visibility as ViewIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  BarChart as ChartIcon,
  Timeline as TimelineIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TableChart as TableIcon,
  GridOn as GridIcon,
  ViewKanban as KanbanIcon,
  DynamicForm as FormIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { projectAPI } from '../shared/services/projectAPI';
import { Project, Task, ProjectStatus, TaskStatus, TaskPriority } from '../shared/types/projectTypes';
import CommonHeader from '../components/CommonHeader';
import TaskBoard from './TaskBoard';
import ProjectTimeline from './ProjectTimeline';
import ProjectAnalytics from './ProjectAnalytics';
import SheetList from '../components/project/SheetList';
import ProjectSheetComponent from '../components/project/ProjectSheet';
import { sheetAPI } from '../shared/services/sheetAPI';
import { ProjectSheet, SheetType } from '../shared/types/sheetTypes';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface Comment {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  content: string;
  created_at: string;
  attachments?: string[];
}

interface ProjectUpdate {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  type: 'status_change' | 'task_completed' | 'member_added' | 'comment' | 'file_upload';
  message: string;
  created_at: string;
  metadata?: any;
}

// Project Status Configuration
const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
  bgColor: string;
  textColor: string;
}> = {
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

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const ProjectDetail: React.FC = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Enhanced state management
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [sheets, setSheets] = useState<ProjectSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<ProjectSheet | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  // Enhanced project loading
  const loadProject = async () => {
    if (!teamId || !projectId) return;
    
    try {
      setLoading(true);
      const [projectResponse, tasksResponse] = await Promise.all([
        projectAPI.getProject(teamId, projectId),
        projectAPI.getTasks(teamId, projectId)
      ]);
      
      const projectData = projectResponse.data;
      const tasksData = tasksResponse.data;
      
      // Enhance project data with calculated progress
      const enhancedProject = {
        ...projectData,
        progress: calculateProjectProgress(projectData, tasksData),
        days_remaining: getDaysRemaining(projectData.end_date),
      };
      
      setProject(enhancedProject);
      setTasks(tasksData);
      
      // Load mock comments and updates (replace with actual API calls)
      loadMockComments();
      loadMockUpdates();
      
    } catch (error) {
      console.error('Failed to load project:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load project details', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Add function to load sheets
  const loadSheets = async () => {
    if (!teamId || !projectId) return;
    
    try {
      setSheetsLoading(true);
      const response = await sheetAPI.getSheets(teamId, projectId);
      setSheets(response.data);
    } catch (error) {
      console.error('Failed to load sheets:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load sheets',
        severity: 'error'
      });
    } finally {
      setSheetsLoading(false);
    }
  };

  // Mock data functions (replace with actual API calls)
  const loadMockComments = () => {
    const mockComments: Comment[] = [
      {
        id: '1',
        user: {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          avatar: null,
        },
        content: 'Great progress on the initial setup! Looking forward to seeing the design mockups.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        user: {
          id: '2',
          first_name: 'Sarah',
          last_name: 'Wilson',
          avatar: null,
        },
        content: 'I\'ve uploaded the design files. Please review and let me know your thoughts.',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ];
    setComments(mockComments);
  };

  const loadMockUpdates = () => {
    const mockUpdates: ProjectUpdate[] = [
      {
        id: '1',
        user: {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          avatar: null,
        },
        type: 'status_change',
        message: 'changed project status to Active',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        metadata: { from: 'Planning', to: 'Active' }
      },
      {
        id: '2',
        user: {
          id: '2',
          first_name: 'Sarah',
          last_name: 'Wilson',
          avatar: null,
        },
        type: 'task_completed',
        message: 'completed task "Design System Setup"',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        metadata: { task_id: '1', task_title: 'Design System Setup' }
      },
    ];
    setUpdates(mockUpdates);
  };

  // Utility functions
  const calculateProjectProgress = (project: Project, tasks: Task[]): number => {
    if (project.status === ProjectStatus.COMPLETED) return 100;
    if (project.status === ProjectStatus.CANCELLED) return 0;
    
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getDaysRemaining = (endDate: string): number => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSheetIcon = (sheetType: SheetType) => {
    switch (sheetType) {
      case SheetType.SPREADSHEET: return <GridIcon sx={{ fontSize: 20, mr: 1 }} />;
      case SheetType.KANBAN: return <KanbanIcon sx={{ fontSize: 20, mr: 1 }} />;
      case SheetType.TABLE: return <TableIcon sx={{ fontSize: 20, mr: 1 }} />;
      case SheetType.FORM: return <FormIcon sx={{ fontSize: 20, mr: 1 }} />;
      default: return <TableIcon sx={{ fontSize: 20, mr: 1 }} />;
    }
  };

  useEffect(() => {
    if (teamId && projectId) {
      loadProject();
      loadSheets();
    }
  }, [teamId, projectId]);

  // Enhanced navigation
  const handleBackClick = () => {
    if (selectedSheet) {
      setSelectedSheet(null);
    } else {
      navigate(`/team/${teamId}/projects`);
    }
  };

  // Project menu handlers
  const handleProjectMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProjectMenuAnchor(event.currentTarget);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
  };

  // Enhanced project actions
  const handleStatusChange = async () => {
    if (!teamId || !projectId || !project) return;

    try {
      setActionLoading(true);
      await projectAPI.updateProject(teamId, projectId, { status: newStatus });
      
      setSnackbar({ 
        open: true, 
        message: `Project status updated to ${PROJECT_STATUS_CONFIG[newStatus].label}`, 
        severity: 'success' 
      });
      
      setStatusDialogOpen(false);
      await loadProject(); // Reload to get updated data
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update project status';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setDeleteConfirmText('');
    handleProjectMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!teamId || !projectId || !project) return;

    if (deleteConfirmText !== project.name) {
      setSnackbar({ 
        open: true, 
        message: 'Project name does not match', 
        severity: 'error' 
      });
      return;
    }

    try {
      setDeleteLoading(true);
      await projectAPI.deleteProject(teamId, projectId);
      setSnackbar({ 
        open: true, 
        message: 'Project deleted successfully', 
        severity: 'success' 
      });
      navigate(`/team/${teamId}/projects`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete project';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const getProjectStatusConfig = (status: ProjectStatus) => {
    return PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG[ProjectStatus.PLANNING];
  };

  const handleSettingsClick = () => {
    navigate(`/team/${teamId}/project/${projectId}/settings`);
    handleProjectMenuClose();
  };

  const handleEditClick = () => {
    navigate(`/team/${teamId}/project/${projectId}/edit`);
    handleProjectMenuClose();
  };

  const handleShareProject = () => {
    // Implement share functionality
    setSnackbar({ 
      open: true, 
      message: 'Project sharing link copied to clipboard', 
      severity: 'info' 
    });
    handleProjectMenuClose();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSendingComment(true);
      // Replace with actual API call
      const newComment: Comment = {
        id: Date.now().toString(),
        user: {
          id: user?.id || '1',
          first_name: user?.first_name || 'User',
          last_name: user?.last_name || '',
          avatar: null,
        },
        content: commentText,
        created_at: new Date().toISOString(),
      };

      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      
      setSnackbar({ 
        open: true, 
        message: 'Comment added successfully', 
        severity: 'success' 
      });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to add comment', 
        severity: 'error' 
      });
    } finally {
      setSendingComment(false);
    }
  };

  // Sheet management functions
  const handleSheetSelect = (sheet: ProjectSheet) => {
    setSelectedSheet(sheet);
    // Switch to Sheets tab when a sheet is selected
    setTabValue(4); // Assuming Sheets tab is at index 4
  };

  const handleSheetBack = () => {
    setSelectedSheet(null);
    loadSheets(); // Reload sheets to get any updates
  };

  const handleSheetUpdate = () => {
    loadSheets();
    if (selectedSheet) {
      // Reload the current sheet
      sheetAPI.getSheet(teamId!, projectId!, selectedSheet.id)
        .then(response => setSelectedSheet(response.data))
        .catch(console.error);
    }
  };

  // Custom actions for CommonHeader
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Tooltip title="Project Settings">
        <IconButton 
          onClick={handleSettingsClick}
          sx={{ 
            backgroundColor: 'primary.50',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.100',
            }
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Share Project">
        <IconButton 
          onClick={handleShareProject}
          sx={{ 
            backgroundColor: 'secondary.50',
            color: 'secondary.main',
            '&:hover': {
              backgroundColor: 'secondary.100',
            }
          }}
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Loading state
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
            Loading project details...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <CommonHeader 
          showBackButton
          backButtonPath={`/team/${teamId}/projects`}
          title="Project Not Found"
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
            <TaskIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
            <Typography variant="h4" gutterBottom fontWeight="600" color="text.primary">
              Project Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              The project you're looking for doesn't exist or you don't have permission to access it.
            </Typography>
            <Button 
              onClick={handleBackClick}
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
              Back to Projects
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
        backButtonPath={selectedSheet ? undefined : `/team/${teamId}/projects`}
        onBackClick={handleBackClick}
        title={selectedSheet ? selectedSheet.name : project.name}
        subtitle={selectedSheet ? selectedSheet.description || "Collaborative sheet" : project.description || "Project workspace"}
        customActions={headerActions}
        variant="page"
      />

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {!selectedSheet && (
          <>
            {/* Project Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {/* Progress Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 3, 
                        backgroundColor: 'primary.50',
                        color: 'primary.main',
                        flexShrink: 0
                      }}>
                        <ProgressIcon fontSize="medium" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
                          Overall Progress
                        </Typography>
                        <Typography variant="h3" fontWeight="700" color="primary.main">
                          {project.progress || 0}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={project.progress || 0} 
                          sx={{ 
                            mt: 1,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tasks Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 3, 
                        backgroundColor: 'secondary.50',
                        color: 'secondary.main',
                        flexShrink: 0
                      }}>
                        <TaskIcon fontSize="medium" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
                          Total Tasks
                        </Typography>
                        <Typography variant="h3" fontWeight="700" color="secondary.main">
                          {project.task_count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tasks.filter(t => t.status === TaskStatus.DONE).length} completed
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Timeline Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 3, 
                        backgroundColor: 'warning.50',
                        color: 'warning.main',
                        flexShrink: 0
                      }}>
                        <CalendarIcon fontSize="medium" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
                          Days Remaining
                        </Typography>
                        <Typography variant="h3" fontWeight="700" color="warning.main">
                          {project.days_remaining}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ends {formatDate(project.end_date)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status Card - Clickable */}
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
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => {
                    setNewStatus(project.status);
                    setStatusDialogOpen(true);
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 3, 
                        backgroundColor: getProjectStatusConfig(project.status).bgColor,
                        color: getProjectStatusConfig(project.status).textColor,
                        flexShrink: 0
                      }}>
                        {getProjectStatusConfig(project.status).icon}
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 1 }}>
                          Current Status
                        </Typography>
                        <Typography 
                          variant="h3" 
                          fontWeight="700" 
                          color={getProjectStatusConfig(project.status).textColor}
                          sx={{ fontSize: '1.8rem' }}
                        >
                          {getProjectStatusConfig(project.status).label}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* Enhanced Tabs Section - Only show when no sheet is selected */}
        {!selectedSheet ? (
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
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              indicatorColor="primary"
              textColor="primary"
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons="auto"
              sx={{ 
                borderBottom: '1px solid',
                borderColor: 'divider',
                px: { xs: 2, md: 3 },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  py: 2,
                  px: 3,
                  minHeight: '60px',
                  minWidth: 'auto'
                }
              }}
            >
              <Tab 
                icon={<DashboardIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Task Board" 
              />
              <Tab 
                icon={<TimelineIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Timeline" 
              />
              <Tab 
                icon={<ChatIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Discussion" 
              />
              <Tab 
                icon={<ChartIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Analytics" 
              />
              <Tab 
                icon={<TableIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Sheets" 
              />
              <Tab 
                icon={<SettingsIcon sx={{ fontSize: 20, mr: 1 }} />} 
                iconPosition="start" 
                label="Settings" 
              />
            </Tabs>

            <Box sx={{ px: { xs: 2, md: 3 } }}>
              {/* Task Board Tab */}
              <TabPanel value={tabValue} index={0}>
                <TaskBoard 
                  teamId={teamId!} 
                  projectId={projectId!} 
                  tasks={tasks} 
                  onTasksUpdate={loadProject}
                />
              </TabPanel>

              {/* Timeline Tab */}
              <TabPanel value={tabValue} index={1}>
                <ProjectTimeline 
                  project={project}
                  tasks={tasks}
                  onTaskUpdate={loadProject}
                />
              </TabPanel>

              {/* Discussion Tab */}
              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={4}>
                  <Grid item xs={12} lg={8}>
                    {/* Comments Section */}
                    <Paper 
                      sx={{ 
                        borderRadius: 3,
                        backgroundColor: 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden'
                      }}
                    >
                      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight="700">
                          Project Discussion
                        </Typography>
                      </Box>

                      {/* Comment Input */}
                      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          sx={{ 
                            mb: 2,
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2,
                            } 
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tooltip title="Attach file">
                            <IconButton size="small">
                              <AttachFileIcon />
                            </IconButton>
                          </Tooltip>
                          <Button
                            variant="contained"
                            endIcon={<SendIcon />}
                            onClick={handleAddComment}
                            disabled={!commentText.trim() || sendingComment}
                            sx={{ borderRadius: 2 }}
                          >
                            {sendingComment ? 'Posting...' : 'Post Comment'}
                          </Button>
                        </Box>
                      </Box>

                      {/* Comments List */}
                      <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {comments.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CommentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary">
                              No comments yet. Start the discussion!
                            </Typography>
                          </Box>
                        ) : (
                          <List sx={{ p: 0 }}>
                            {comments.map((comment, index) => (
                              <React.Fragment key={comment.id}>
                                <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                                  <ListItemAvatar sx={{ minWidth: 50 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                      {comment.user.first_name[0]}{comment.user.last_name[0]}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography variant="subtitle2" fontWeight="600">
                                          {comment.user.first_name} {comment.user.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDateTime(comment.created_at)}
                                        </Typography>
                                      </Box>
                                    }
                                    secondary={
                                      <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {comment.content}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                                {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                              </React.Fragment>
                            ))}
                          </List>
                        )}
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    {/* Recent Activity */}
                    <Paper 
                      sx={{ 
                        borderRadius: 3,
                        backgroundColor: 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden'
                      }}
                    >
                      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight="700">
                          Recent Activity
                        </Typography>
                      </Box>
                      
                      <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {updates.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <NotificationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary">
                              No recent activity
                            </Typography>
                          </Box>
                        ) : (
                          <List sx={{ p: 0 }}>
                            {updates.map((update, index) => (
                              <React.Fragment key={update.id}>
                                <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                                  <ListItemAvatar sx={{ minWidth: 40 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                      {update.user.first_name[0]}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" color="text.primary">
                                        <strong>{update.user.first_name} {update.user.last_name}</strong> {update.message}
                                      </Typography>
                                    }
                                    secondary={
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(update.created_at)}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                                {index < updates.length - 1 && <Divider variant="inset" component="li" />}
                              </React.Fragment>
                            ))}
                          </List>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Analytics Tab */}
              <TabPanel value={tabValue} index={3}>
                <ProjectAnalytics 
                  project={project}
                  tasks={tasks}
                />
              </TabPanel>

              {/* Sheets Tab */}
              <TabPanel value={tabValue} index={4}>
                <SheetList
                  teamId={teamId!}
                  projectId={projectId!}
                  sheets={sheets}
                  onSheetsUpdate={loadSheets}
                  onSheetSelect={handleSheetSelect}
                />
              </TabPanel>

              {/* Settings Tab */}
              <TabPanel value={tabValue} index={5}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Project Settings
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Advanced project configuration and management options
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleSettingsClick}
                    sx={{ borderRadius: 2 }}
                  >
                    Open Settings
                  </Button>
                </Box>
              </TabPanel>
            </Box>
          </Paper>
        ) : (
          /* Sheet View when a sheet is selected */
          <ProjectSheetComponent
            teamId={teamId!}
            projectId={projectId!}
            sheet={selectedSheet}
            onSheetUpdate={handleSheetUpdate}
            onBack={handleSheetBack}
          />
        )}
      </Container>

      {/* Project Menu */}
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
          onClick={handleShareProject}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <ShareIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <Typography variant="body2" fontWeight="500">
            Share Project
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

      {/* Status Change Dialog */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)} 
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
          Update Project Status
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Typography paragraph sx={{ mb: 3 }}>
            Change the status of <strong>{project.name}</strong>:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
              <Card
                key={status}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: newStatus === parseInt(status) ? `${config.color}.main` : 'divider',
                  backgroundColor: newStatus === parseInt(status) ? `${config.color}.50` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: `${config.color}.main`,
                    backgroundColor: `${config.color}.50`
                  }
                }}
                onClick={() => setNewStatus(parseInt(status))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: `${config.color}.main` }}>
                    {config.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="600">
                      {config.label}
                    </Typography>
                  </Box>
                  {newStatus === parseInt(status) && (
                    <Box sx={{ color: `${config.color}.main` }}>
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
            onClick={() => setStatusDialogOpen(false)}
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
            onClick={handleStatusChange}
            variant="contained"
            disabled={actionLoading || newStatus === project.status}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {actionLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

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
          Delete Project
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
            This action cannot be undone. This will permanently delete the project and all associated tasks, comments, and data.
          </Alert>
          
          <Typography variant="body1" paragraph>
            Please type <strong>{project.name}</strong> to confirm deletion.
          </Typography>
          
          <TextField
            fullWidth
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={`Type "${project.name}" to confirm`}
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
              fontWeight: '600'
            }}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleDeleteConfirm}
            disabled={!project.name || deleteConfirmText !== project.name || deleteLoading}
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
          aria-label="project actions"
          onClick={handleProjectMenuOpen}
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
          <MoreIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ProjectDetail;