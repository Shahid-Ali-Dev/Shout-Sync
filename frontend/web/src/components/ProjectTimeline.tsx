import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Timeline as TimelineIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Notifications as NotificationIcon,
  Attachment as AttachmentIcon,
  Comment as CommentIcon,
  MoreVert as MoreIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import Snackbar from '@mui/material/Snackbar';
import { Project, Task, TaskStatus, TaskPriority } from '../shared/types/projectTypes';

interface TimelineTask extends Task {
  position?: number;
  dependencies?: string[];
  progress?: number;
}

interface TimelineViewProps {
  project: Project;
  tasks: Task[];
  onTaskUpdate: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Timeline view types
type TimelineViewType = 'week' | 'month' | 'quarter';
type TaskFilter = 'all' | 'active' | 'completed' | 'overdue';

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`timeline-tabpanel-${index}`}
      aria-labelledby={`timeline-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};



const ProjectTimeline: React.FC<TimelineViewProps> = ({ project, tasks, onTaskUpdate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [timelineTasks, setTimelineTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<TimelineViewType>('month');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [newTask, setNewTask] = useState<Partial<TimelineTask>>({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: null,
  });

  // Enhanced task status configuration
    const TASK_STATUS_CONFIG = {
    [TaskStatus.TODO]: {
        label: 'To Do',
        color: 'default',
        icon: <PendingIcon />,
        bgColor: 'grey.50',
        textColor: 'grey.700'
    },
    [TaskStatus.IN_PROGRESS]: {
        label: 'In Progress',
        color: 'warning',
        icon: <PlayIcon />,
        bgColor: 'warning.50',
        textColor: 'warning.700'
    },
    [TaskStatus.IN_REVIEW]: {        // ✅ Add this
        label: 'In Review',
        color: 'info',
        icon: <ScheduleIcon />,
        bgColor: 'info.50',
        textColor: 'info.700'
    },
    [TaskStatus.DONE]: {
        label: 'Completed',
        color: 'success',
        icon: <CheckCircleIcon />,
        bgColor: 'success.50',
        textColor: 'success.700'
    },
    [TaskStatus.BLOCKED]: {      
        label: 'Blocked',
        color: 'error',
        icon: <PauseIcon />,
        bgColor: 'error.50',
        textColor: 'error.700'
    },
    [TaskStatus.BACKLOG]: {
        label: 'Backlog',
        color: 'default',
        icon: <PendingIcon />,
        bgColor: 'grey.100',
        textColor: 'grey.600'
    },
    };

    // Add these type guard functions after the configuration objects
    const isValidTaskStatus = (status: number): status is TaskStatus => {
    return Object.values(TaskStatus).includes(status as TaskStatus);
    };

    const isValidTaskPriority = (priority: number): priority is TaskPriority => {
    return Object.values(TaskPriority).includes(priority as TaskPriority);
    };

    // Helper functions to safely get config
    const getTaskStatusConfig = (status: number) => {
    return isValidTaskStatus(status) 
        ? TASK_STATUS_CONFIG[status]
        : TASK_STATUS_CONFIG[TaskStatus.TODO]; // fallback
    };

    const getTaskPriorityConfig = (priority: number) => {
    return isValidTaskPriority(priority)
        ? TASK_PRIORITY_CONFIG[priority]
        : TASK_PRIORITY_CONFIG[TaskPriority.MEDIUM]; // fallback
    };


  const TASK_PRIORITY_CONFIG = {
    [TaskPriority.LOW]: { label: 'Low', color: 'default' as const },
    [TaskPriority.MEDIUM]: { label: 'Medium', color: 'primary' as const },
    [TaskPriority.HIGH]: { label: 'High', color: 'warning' as const },
    [TaskPriority.URGENT]: { label: 'Urgent', color: 'error' as const },
  };


  // Snackbar state
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  
  // Initialize timeline tasks with enhanced data
  useEffect(() => {
    const initializeTimeline = async () => {
      setLoading(true);
      try {
        const enhancedTasks: TimelineTask[] = tasks.map((task, index) => ({
          ...task,
          position: index,
          dependencies: [],
          progress: calculateTaskProgress(task),
        }));
        
        setTimelineTasks(enhancedTasks);
      } catch (error) {
        console.error('Failed to initialize timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeTimeline();
  }, [tasks]);

  // Calculate task progress based on subtasks or time
  const calculateTaskProgress = (task: Task): number => {
    if (task.status === TaskStatus.DONE) return 100;
    if (task.status === TaskStatus.TODO) return 0;
    
    // Simple progress calculation based on time
    if (task.start_date && task.end_date) {
      const start = new Date(task.start_date).getTime();
      const end = new Date(task.end_date).getTime();
      const now = new Date().getTime();
      
      if (now >= end) return task.status === TaskStatus.DONE ? 100 : 90;
      if (now <= start) return 0;
      
      const totalDuration = end - start;
      const elapsed = now - start;
      return Math.min(Math.round((elapsed / totalDuration) * 100), 90);
    }
    
    return 0;
  };

  // Get tasks for the current view
  const getFilteredTasks = (): TimelineTask[] => {
    let filtered = timelineTasks;

    // Apply status filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(task => 
          task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.IN_REVIEW
        );
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === TaskStatus.DONE);
        break;
      case 'overdue':
        filtered = filtered.filter(task => {
          if (!task.end_date) return false;
          return new Date(task.end_date) < new Date() && task.status !== TaskStatus.DONE;
        });
        break;
      default:
        // 'all' - no filter
        break;
    }

    return filtered;
  };

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (viewType) {
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get date range for current view
  const getDateRange = (): { start: Date; end: Date } => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    switch (viewType) {
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(end.getDate() + (6 - end.getDay()));
        break;
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'quarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
        end.setMonth((quarter + 1) * 3);
        end.setDate(0);
        break;
    }

    return { start, end };
  };

  // Generate timeline headers based on view type
  const generateTimelineHeaders = (): Date[] => {
    const { start, end } = getDateRange();
    const headers: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return headers;
  };

  // Check if task falls within date range
  const isTaskInRange = (task: TimelineTask, date: Date): boolean => {
    if (!task.start_date || !task.end_date) return false;
    
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    return date >= taskStart && date <= taskEnd;
  };

  // Get task bar width and position
  const getTaskBarPosition = (task: TimelineTask): { startIndex: number; width: number } => {
    const headers = generateTimelineHeaders();
    if (!task.start_date || !task.end_date) return { startIndex: 0, width: 1 };

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    
    const startIndex = headers.findIndex(date => date >= taskStart);
    const endIndex = headers.findIndex(date => date >= taskEnd);
    
    if (startIndex === -1) return { startIndex: 0, width: 1 };
    if (endIndex === -1) return { startIndex, width: headers.length - startIndex };
    
    return { startIndex, width: Math.max(1, endIndex - startIndex + 1) };
  };

  // Task dialog handlers
  const handleOpenTaskDialog = (task?: TimelineTask) => {
    if (task) {
      setSelectedTask(task);
      setNewTask({
        ...task,
        start_date: task.start_date ? task.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: task.end_date ? task.end_date.split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: task.due_date ? task.due_date.split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } else {
      setSelectedTask(null);
      setNewTask({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignee: null,
      });
    }
    setTaskDialogOpen(true);
  };

  const handleCloseTaskDialog = () => {
    setTaskDialogOpen(false);
    setSelectedTask(null);
    setNewTask({
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignee: null,
    });
  };

  const handleSaveTask = async () => {
    // Here you would typically make an API call to save the task
    console.log('Saving task:', newTask);
    
    // Simulate API call
    setTimeout(() => {
      setSnackbar({ open: true, message: 'Task saved successfully', severity: 'success' });
      handleCloseTaskDialog();
      onTaskUpdate(); // Refresh the task list
    }, 500);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredTasks = getFilteredTasks();
  const timelineHeaders = generateTimelineHeaders();
  const { start: rangeStart, end: rangeEnd } = getDateRange();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Timeline Header Controls */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3,
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* View Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tabs
              value={viewType}
              onChange={(_, newValue) => setViewType(newValue)}
              sx={{ 
                minHeight: 'auto',
                '& .MuiTab-root': {
                  minHeight: 'auto',
                  py: 1,
                  px: 2,
                  fontSize: '0.8rem',
                  textTransform: 'none'
                }
              }}
            >
              <Tab value="week" label="Week" />
              <Tab value="month" label="Month" />
              <Tab value="quarter" label="Quarter" />
            </Tabs>
          </Box>

          {/* Date Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateDate('prev')} size="small">
              <ArrowBackIcon />
            </IconButton>
            
            <Tooltip title="Go to Today">
              <IconButton onClick={goToToday} size="small" color="primary">
                <TodayIcon />
              </IconButton>
            </Tooltip>
            
            <Typography variant="h6" fontWeight="600" sx={{ minWidth: 200, textAlign: 'center' }}>
              {rangeStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {viewType !== 'month' && ` - ${rangeEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            </Typography>
            
            <IconButton onClick={() => navigateDate('next')} size="small">
              <ArrowForwardIcon />
            </IconButton>
          </Box>

          {/* Filter Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filter}
                label="Filter"
                onChange={(e) => setFilter(e.target.value as TaskFilter)}
              >
                <MenuItem value="all">All Tasks</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenTaskDialog()}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              New Task
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Timeline View */}
      <Paper 
        sx={{ 
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'auto'
        }}
      >
        {/* Timeline Header */}
        <Box sx={{ 
          display: 'flex', 
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'grey.50'
        }}>
          {/* Task Column Header */}
          <Box sx={{ 
            minWidth: 300, 
            p: 2, 
            borderRight: '1px solid',
            borderColor: 'divider',
            fontWeight: '600'
          }}>
            Tasks
          </Box>
          
          {/* Date Headers */}
          <Box sx={{ display: 'flex', flex: 1, minWidth: timelineHeaders.length * 60 }}>
            {timelineHeaders.map((date, index) => (
              <Box
                key={index}
                sx={{
                  minWidth: 60,
                  p: 1,
                  textAlign: 'center',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: isToday(date) ? 'primary.50' : 'transparent',
                  fontWeight: isToday(date) ? '600' : '400',
                  color: isToday(date) ? 'primary.main' : 'text.primary'
                }}
              >
                <Typography variant="caption" display="block" fontWeight="600">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
                <Typography variant="body2">
                  {date.getDate()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timeline Rows */}
        <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
          {filteredTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Tasks Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {filter === 'all' 
                  ? 'Create your first task to get started.' 
                  : `No ${filter} tasks match your criteria.`
                }
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenTaskDialog()}
                sx={{ borderRadius: 2 }}
              >
                Create Task
              </Button>
            </Box>
          ) : (
            filteredTasks.map((task, taskIndex) => {
              const { startIndex, width } = getTaskBarPosition(task);
              
              return (
                <Box
                  key={task.id}
                  sx={{
                    display: 'flex',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  {/* Task Info Column */}
                  <Box sx={{ 
                    minWidth: 300, 
                    p: 2, 
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" fontWeight="600" sx={{ flex: 1 }}>
                        {task.title}
                      </Typography>
                      <IconButton size="small" onClick={() => handleOpenTaskDialog(task)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                        icon={getTaskStatusConfig(task.status).icon}
                        label={getTaskStatusConfig(task.status).label}
                        size="small"
                        color={getTaskStatusConfig(task.status).color as any}
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                        />
                        <Chip
                        icon={<FlagIcon />}
                        label={getTaskPriorityConfig(task.priority).label}
                        size="small"
                        color={getTaskPriorityConfig(task.priority).color as any}
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                        />
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={task.progress || 0}
                        sx={{ 
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {task.progress || 0}% complete
                      </Typography>
                    </Box>

                    {/* Assignee */}
                    {task.assignee_details && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.7rem' }}>
                          {task.assignee_details.first_name?.[0]}{task.assignee_details.last_name?.[0]}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {task.assignee_details.first_name} {task.assignee_details.last_name}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Timeline Visualization */}
                  <Box sx={{ 
                    display: 'flex', 
                    flex: 1, 
                    minWidth: timelineHeaders.length * 60,
                    position: 'relative'
                  }}>
                    {timelineHeaders.map((date, dateIndex) => (
                      <Box
                        key={dateIndex}
                        sx={{
                          minWidth: 60,
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          position: 'relative',
                            backgroundColor: isTaskInRange(task, date) 
                            ? getTaskStatusConfig(task.status).bgColor
                            : 'transparent'}}
                      />
                    ))}
                    
                    {/* Task Bar */}
                    {task.start_date && task.end_date && (
                      <Tooltip title={`${task.title} - ${getTaskStatusConfig(task.status).label}`}>
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: startIndex * 60 + 4,
                            width: width * 60 - 8,
                            height: 24,
                            backgroundColor: getTaskStatusConfig(task.status).textColor,
                            borderRadius: 2,
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            '&:hover': {
                              opacity: 0.8
                            }
                          }}
                          onClick={() => handleOpenTaskDialog(task)}
                        >
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'white', 
                              fontWeight: '600',
                              fontSize: '0.7rem',
                              px: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Paper>

      {/* Task Summary Cards */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'primary.50', color: 'primary.main' }}>
                  <PendingIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {timelineTasks.filter(t => t.status === TaskStatus.TODO).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    To Do
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'warning.50', color: 'warning.main' }}>
                  <PlayIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {timelineTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'success.50', color: 'success.main' }}>
                  <CheckCircleIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {timelineTasks.filter(t => t.status === TaskStatus.DONE).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'error.50', color: 'error.main' }}>
                  <ScheduleIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {timelineTasks.filter(t => {
                      if (!t.end_date) return false;
                      return new Date(t.end_date) < new Date() && t.status !== TaskStatus.DONE;
                    }).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Dialog */}
      <Dialog 
        open={taskDialogOpen} 
        onClose={handleCloseTaskDialog}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          {selectedTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Task Title"
                fullWidth
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newTask.status}
                  label="Status"
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                  sx={{ borderRadius: 2 }}
                >
                  {Object.entries(TASK_STATUS_CONFIG).map(([status, config]) => (
                    <MenuItem key={status} value={parseInt(status)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {config.icon}
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  label="Priority"
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                  sx={{ borderRadius: 2 }}
                >
                  {Object.entries(TASK_PRIORITY_CONFIG).map(([priority, config]) => (
                    <MenuItem key={priority} value={parseInt(priority)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlagIcon fontSize="small" />
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newTask.start_date}
                onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newTask.end_date}
                onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                  } 
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={handleCloseTaskDialog}
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
            onClick={handleSaveTask}
            variant="contained"
            disabled={!newTask.title}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {selectedTask ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>

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
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add task"
          onClick={() => handleOpenTaskDialog()}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            boxShadow: '0 8px 30px rgba(37, 99, 235, 0.3)',
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ProjectTimeline;