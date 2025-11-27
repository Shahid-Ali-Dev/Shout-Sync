import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  AvatarGroup,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  PlayArrow as PlayIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  CalendarToday as CalendarIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { Project, Task, TaskStatus, TaskPriority } from '../shared/types/projectTypes';
import { projectAPI } from '../shared/services/projectAPI';

interface ProjectAnalyticsProps {
  project: Project;
  tasks: Task[];
}

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionTime: number;
  };
  statusDistribution: {
    [key: string]: number;
  };
  priorityDistribution: {
    [key: string]: number;
  };
  memberPerformance: Array<{
    member: {
      id: string;
      first_name: string;
      last_name: string;
      avatar: string | null;
    };
    assignedTasks: number;
    completedTasks: number;
    completionRate: number;
    averageCompletionTime: number;
  }>;
  timelineStats: {
    createdThisWeek: number;
    completedThisWeek: number;
    dueThisWeek: number;
  };
  weeklyProgress: Array<{
    week: string;
    created: number;
    completed: number;
    inProgress: number;
  }>;
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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// Task status configuration
const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
  bgColor: string;
  textColor: string;
}> = {
  [TaskStatus.BACKLOG]: {
    label: 'Backlog',
    color: 'default',
    icon: <PendingIcon />,
    bgColor: 'grey.100',
    textColor: 'grey.600'
  },
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
  [TaskStatus.IN_REVIEW]: {
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
    icon: <PendingIcon />,
    bgColor: 'error.50',
    textColor: 'error.700'
  },
};

// Task priority configuration
const TASK_PRIORITY_CONFIG = {
  [TaskPriority.LOW]: { label: 'Low', color: 'default' as const, bgColor: 'grey.50' },
  [TaskPriority.MEDIUM]: { label: 'Medium', color: 'primary' as const, bgColor: 'primary.50' },
  [TaskPriority.HIGH]: { label: 'High', color: 'warning' as const, bgColor: 'warning.50' },
  [TaskPriority.URGENT]: { label: 'Urgent', color: 'error' as const, bgColor: 'error.50' },
};

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ project, tasks }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Calculate analytics data
  const calculateAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate overview statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
      const inProgressTasks = tasks.filter(task => 
        task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.IN_REVIEW
      ).length;
      
      const overdueTasks = tasks.filter(task => {
        if (!task.due_date || task.status === TaskStatus.DONE) return false;
        return new Date(task.due_date) < new Date();
      }).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate average completion time (in days)
      const completedTasksWithDates = tasks.filter(task => 
        task.status === TaskStatus.DONE && task.created_at && task.updated_at
      );
      
      const averageCompletionTime = completedTasksWithDates.length > 0 
        ? completedTasksWithDates.reduce((acc, task) => {
            const created = new Date(task.created_at);
            const updated = new Date(task.updated_at);
            const diffTime = Math.abs(updated.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return acc + diffDays;
          }, 0) / completedTasksWithDates.length
        : 0;

      // Calculate status distribution
        const statusDistribution = {
        [TaskStatus.BACKLOG]: tasks.filter(task => task.status === TaskStatus.BACKLOG).length,
        [TaskStatus.TODO]: tasks.filter(task => task.status === TaskStatus.TODO).length,
        [TaskStatus.IN_PROGRESS]: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length,
        [TaskStatus.IN_REVIEW]: tasks.filter(task => task.status === TaskStatus.IN_REVIEW).length,
        [TaskStatus.DONE]: tasks.filter(task => task.status === TaskStatus.DONE).length,
        [TaskStatus.BLOCKED]: tasks.filter(task => task.status === TaskStatus.BLOCKED).length,
        };

      // Calculate priority distribution
      const priorityDistribution = {
        [TaskPriority.LOW]: tasks.filter(task => task.priority === TaskPriority.LOW).length,
        [TaskPriority.MEDIUM]: tasks.filter(task => task.priority === TaskPriority.MEDIUM).length,
        [TaskPriority.HIGH]: tasks.filter(task => task.priority === TaskPriority.HIGH).length,
        [TaskPriority.URGENT]: tasks.filter(task => task.priority === TaskPriority.URGENT).length,
      };

      // Calculate member performance
      const memberMap = new Map();
      tasks.forEach(task => {
        if (task.assignee_details) {
          const memberId = task.assignee_details.id;
          if (!memberMap.has(memberId)) {
            memberMap.set(memberId, {
              member: task.assignee_details,
              assignedTasks: 0,
              completedTasks: 0,
              totalCompletionTime: 0,
              completedTasksCount: 0
            });
          }
          
          const memberData = memberMap.get(memberId);
          memberData.assignedTasks++;
          
          if (task.status === TaskStatus.DONE) {
            memberData.completedTasks++;
            if (task.created_at && task.updated_at) {
              const created = new Date(task.created_at);
              const updated = new Date(task.updated_at);
              const diffTime = Math.abs(updated.getTime() - created.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              memberData.totalCompletionTime += diffDays;
              memberData.completedTasksCount++;
            }
          }
        }
      });

      const memberPerformance = Array.from(memberMap.values()).map(memberData => ({
        member: memberData.member,
        assignedTasks: memberData.assignedTasks,
        completedTasks: memberData.completedTasks,
        completionRate: memberData.assignedTasks > 0 
          ? Math.round((memberData.completedTasks / memberData.assignedTasks) * 100)
          : 0,
        averageCompletionTime: memberData.completedTasksCount > 0
          ? Math.round(memberData.totalCompletionTime / memberData.completedTasksCount)
          : 0
      }));

      

      // Calculate timeline statistics
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const createdThisWeek = tasks.filter(task => 
        task.created_at && new Date(task.created_at) >= oneWeekAgo
      ).length;
      
      const completedThisWeek = tasks.filter(task => 
        task.status === TaskStatus.DONE && 
        task.updated_at && 
        new Date(task.updated_at) >= oneWeekAgo
      ).length;
      
      const dueThisWeek = tasks.filter(task => {
        if (!task.due_date || task.status === TaskStatus.DONE) return false;
        const dueDate = new Date(task.due_date);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return dueDate <= nextWeek && dueDate >= new Date();
      }).length;

      // Generate weekly progress data (last 8 weeks)
      const weeklyProgress = Array.from({ length: 8 }, (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (7 * (7 - i)));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        
        const created = tasks.filter(task => 
          task.created_at && 
          new Date(task.created_at) >= weekStart && 
          new Date(task.created_at) <= weekEnd
        ).length;
        
        const completed = tasks.filter(task => 
          task.status === TaskStatus.DONE && 
          task.updated_at && 
          new Date(task.updated_at) >= weekStart && 
          new Date(task.updated_at) <= weekEnd
        ).length;
        
        const inProgress = tasks.filter(task => 
          (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.IN_REVIEW) &&
          task.created_at && 
          new Date(task.created_at) <= weekEnd
        ).length;

        return {
          week: weekLabel,
          created,
          completed,
          inProgress
        };
      });

      const data: AnalyticsData = {
        overview: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionRate,
          averageCompletionTime: Math.round(averageCompletionTime)
        },
        statusDistribution,
        priorityDistribution,
        memberPerformance,
        timelineStats: {
          createdThisWeek,
          completedThisWeek,
          dueThisWeek
        },
        weeklyProgress
      };

      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to calculate analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    calculateAnalytics();
  }, [tasks, timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    calculateAnalytics();
  };

  const handleExportData = () => {
    // Implement export functionality
    console.log('Exporting analytics data:', analyticsData);
    // In a real implementation, this would generate a CSV or PDF report
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'error.light'
        }}
      >
        {error}
      </Alert>
    );
  }

  if (!analyticsData) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Analytics Data
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analytics data will be available once tasks are created and updated.
        </Typography>
      </Box>
    );
  }

  const { overview, statusDistribution, priorityDistribution, memberPerformance, timelineStats, weeklyProgress } = analyticsData;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Controls */}
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
          <Box>
            <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
              Project Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive insights and performance metrics
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'all')}
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh Analytics">
              <IconButton 
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ 
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.100',
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportData}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
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
            icon={<AssessmentIcon sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<PieChartIcon sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Distribution" 
          />
          <Tab 
            icon={<GroupsIcon sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Team Performance" 
          />
          <Tab 
            icon={<TimelineIcon sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Progress Trends" 
          />
        </Tabs>

        <Box sx={{ px: { xs: 2, md: 3 } }}>
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Key Metrics */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'primary.50', color: 'primary.main' }}>
                        <AssessmentIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight="700" color="primary.main">
                          {overview.totalTasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Tasks
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Across all statuses and priorities
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'success.50', color: 'success.main' }}>
                        <CheckCircleIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight="700" color="success.main">
                          {overview.completedTasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Completed
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {overview.completionRate}% completion rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'warning.50', color: 'warning.main' }}>
                        <PlayIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight="700" color="warning.main">
                          {overview.inProgressTasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          In Progress
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Active work items
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'error.50', color: 'error.main' }}>
                        <ScheduleIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight="700" color="error.main">
                          {overview.overdueTasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Overdue
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Requires attention
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Progress Overview */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                      Project Progress
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight="600">
                          Overall Completion
                        </Typography>
                        <Typography variant="body2" fontWeight="600" color="primary.main">
                          {overview.completionRate}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={overview.completionRate}
                        sx={{ 
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                          }
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="h4" fontWeight="700" color="primary.main">
                            {overview.averageCompletionTime}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Avg. Completion (days)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="h4" fontWeight="700" color="success.main">
                            {timelineStats.completedThisWeek}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Completed This Week
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                      This Week
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          New Tasks
                        </Typography>
                        <Chip label={timelineStats.createdThisWeek} size="small" color="primary" />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Tasks Completed
                        </Typography>
                        <Chip label={timelineStats.completedThisWeek} size="small" color="success" />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Due This Week
                        </Typography>
                        <Chip label={timelineStats.dueThisWeek} size="small" color="warning" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Distribution Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {/* Status Distribution */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                      Task Status Distribution
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(statusDistribution).map(([status, count]) => {
                        const statusConfig = TASK_STATUS_CONFIG[parseInt(status) as TaskStatus];
                        const percentage = overview.totalTasks > 0 
                          ? Math.round((count / overview.totalTasks) * 100)
                          : 0;
                          
                        return (
                          <Box key={status} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ color: statusConfig.textColor }}>
                                  {statusConfig.icon}
                                </Box>
                                <Typography variant="body2" fontWeight="600">
                                  {statusConfig.label}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight="600">
                                {count} ({percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={percentage}
                              sx={{ 
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: statusConfig.textColor
                                }
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Priority Distribution */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                      Task Priority Distribution
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(priorityDistribution).map(([priority, count]) => {
                        const priorityConfig = TASK_PRIORITY_CONFIG[parseInt(priority) as TaskPriority];
                        const percentage = overview.totalTasks > 0 
                          ? Math.round((count / overview.totalTasks) * 100)
                          : 0;
                          
                        return (
                          <Box key={priority} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FlagIcon sx={{ color: priorityConfig.color, fontSize: 16 }} />
                                <Typography variant="body2" fontWeight="600">
                                  {priorityConfig.label}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight="600">
                                {count} ({percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={percentage}
                              sx={{ 
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: priorityConfig.color
                                }
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Team Performance Tab */}
          <TabPanel value={tabValue} index={2}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                  Team Member Performance
                </Typography>
                
                {memberPerformance.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <GroupsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1" color="text.secondary">
                      No team member performance data available
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {memberPerformance.map((member, index) => (
                      <Grid item xs={12} md={6} lg={4} key={member.member.id}>
                        <Paper 
                          sx={{ 
                            p: 3, 
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            height: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {member.member.first_name[0]}{member.member.last_name[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="600">
                                {member.member.first_name} {member.member.last_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.assignedTasks} tasks assigned
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Completion Rate
                              </Typography>
                              <Typography variant="body2" fontWeight="600" color="primary.main">
                                {member.completionRate}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={member.completionRate}
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

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Completed
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {member.completedTasks}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Avg. Time
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {member.averageCompletionTime}d
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          {/* Progress Trends Tab */}
          <TabPanel value={tabValue} index={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>
                  Weekly Progress Trends
                </Typography>
                
                <Grid container spacing={3}>
                  {weeklyProgress.map((week, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Paper 
                        sx={{ 
                          p: 3, 
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                          Week {week.week}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Created:
                            </Typography>
                            <Typography variant="body2" fontWeight="600">
                              {week.created}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Completed:
                            </Typography>
                            <Typography variant="body2" fontWeight="600" color="success.main">
                              {week.completed}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              In Progress:
                            </Typography>
                            <Typography variant="body2" fontWeight="600" color="warning.main">
                              {week.inProgress}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProjectAnalytics;