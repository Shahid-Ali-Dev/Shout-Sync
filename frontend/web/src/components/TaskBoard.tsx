import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  Avatar,
  AvatarGroup,
  alpha,
  useTheme,
  Snackbar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ListItemIcon, ListItemText } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store'; 
import { projectAPI } from '../shared/services/projectAPI';
import { Task, TaskStatus, TaskPriority } from '../shared/types/projectTypes';

interface TaskBoardProps {
  teamId: string;
  projectId: string;
  tasks: Task[];
  onTasksUpdate: () => void;
}

// Task status configuration
const TASK_STATUS_CONFIG = {
  [TaskStatus.BACKLOG]: {
    label: 'Backlog',
    color: 'default',
    bgColor: 'grey.50',
    textColor: 'grey.700'
  },
  [TaskStatus.TODO]: {
    label: 'To Do',
    color: 'default',
    bgColor: 'blue.50',
    textColor: 'blue.700'
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'warning',
    bgColor: 'orange.50',
    textColor: 'orange.700'
  },
  [TaskStatus.IN_REVIEW]: {
    label: 'In Review',
    color: 'info',
    bgColor: 'purple.50',
    textColor: 'purple.700'
  },
  [TaskStatus.DONE]: {
    label: 'Done',
    color: 'success',
    bgColor: 'green.50',
    textColor: 'green.700'
  },
  [TaskStatus.BLOCKED]: {
    label: 'Blocked',
    color: 'error',
    bgColor: 'red.50',
    textColor: 'red.700'
  },
};

const TaskBoard: React.FC<TaskBoardProps> = ({ teamId, projectId, tasks, onTasksUpdate }) => {
  const theme = useTheme();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskMenuAnchor, setTaskMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' 
  });

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    due_date: '',
    assignee: '',
  });

const handleCreateTask = async () => {
  if (!taskData.title.trim()) {
    setSnackbar({ open: true, message: 'Task title is required', severity: 'error' });
    return;
  }

  try {
    setLoading(true);
    
    if (!currentUser?.id) {
      setSnackbar({ open: true, message: 'User not authenticated', severity: 'error' });
      setLoading(false);
      return;
    }

    // Include ALL required fields for your backend
    const formattedData = {
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      status: Number(taskData.status),
      project: projectId, // This should be the project ID
      priority: Number(taskData.priority),
      assignee: currentUser.id, // Assign to current user
      created_by: currentUser.id, // ⭐️ ADD THIS - required by backend
      due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
    };

    console.log('📤 Creating task with data:', formattedData);
    console.log('🔍 Data types:', {
      title: typeof formattedData.title,
      description: typeof formattedData.description,
      status: typeof formattedData.status,
      project: typeof formattedData.project,
      priority: typeof formattedData.priority,
      assignee: typeof formattedData.assignee,
      created_by: typeof formattedData.created_by, // ⭐️ Check this
    });
    
    const response = await projectAPI.createTask(teamId, projectId, formattedData);
    console.log('✅ Task creation response:', response);
    
    setSnackbar({ 
      open: true, 
      message: 'Task created successfully', 
      severity: 'success' 
    });
    
    setCreateDialogOpen(false);
    setTaskData({
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      due_date: '',
      assignee: '',
    });
    
    onTasksUpdate();
  } catch (error: any) {
    console.error('❌ Task creation failed:', error);
    console.error('🔍 Error response data:', error.response?.data);
    console.error('🔍 Error status:', error.response?.status);
    
    // Check if it's still the created_by error
    if (error.response?.data?.includes('created_by_id')) {
      setSnackbar({ 
        open: true, 
        message: 'Backend requires created_by field. Please check API documentation.', 
        severity: 'error' 
      });
      return;
    }
    
    let message = 'Failed to create task';
    if (error.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error.response?.status === 400) {
      message = 'Invalid data. Please check all fields.';
    } else if (error.response?.status === 500) {
      message = 'Server error. Please check backend logs.';
    }
    
    setSnackbar({ open: true, message, severity: 'error' });
  } finally {
    setLoading(false);
  }
};

  const handleTaskMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    setTaskMenuAnchor(event.currentTarget);
    setSelectedTask(task);
  };

  const handleTaskMenuClose = () => {
    setTaskMenuAnchor(null);
    setSelectedTask(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await projectAPI.updateTask(teamId, projectId, taskId, { status: newStatus });
      setSnackbar({ 
        open: true, 
        message: `Task moved to ${TASK_STATUS_CONFIG[newStatus].label}`, 
        severity: 'success' 
      });
      onTasksUpdate();
    } catch (error: any) {
      console.error('Failed to update task status:', error);
      const message = error.response?.data?.error || 'Failed to update task status';
      setSnackbar({ open: true, message, severity: 'error' });
    }
    handleTaskMenuClose();
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      await projectAPI.deleteTask(teamId, projectId, selectedTask.id);
      setSnackbar({ 
        open: true, 
        message: 'Task deleted successfully', 
        severity: 'success' 
      });
      onTasksUpdate();
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      const message = error.response?.data?.error || 'Failed to delete task';
      setSnackbar({ open: true, message, severity: 'error' });
    }
    handleTaskMenuClose();
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case TaskPriority.LOW: return 'Low';
      case TaskPriority.MEDIUM: return 'Medium';
      case TaskPriority.HIGH: return 'High';
      case TaskPriority.URGENT: return 'Urgent';
      default: return 'Medium';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case TaskPriority.LOW: return 'success';
      case TaskPriority.MEDIUM: return 'warning';
      case TaskPriority.HIGH: return 'error';
      case TaskPriority.URGENT: return 'error';
      default: return 'warning';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const columns = [
    { 
      status: TaskStatus.BACKLOG, 
      title: 'Backlog', 
      color: 'grey.50',
      textColor: 'grey.700',
      borderColor: 'grey.200'
    },
    { 
      status: TaskStatus.TODO, 
      title: 'To Do', 
      color: 'primary.50',
      textColor: 'primary.700',
      borderColor: 'primary.200'
    },
    { 
      status: TaskStatus.IN_PROGRESS, 
      title: 'In Progress', 
      color: 'warning.50',
      textColor: 'warning.700',
      borderColor: 'warning.200'
    },
    { 
      status: TaskStatus.IN_REVIEW, 
      title: 'In Review', 
      color: 'info.50',
      textColor: 'info.700',
      borderColor: 'info.200'
    },
    { 
      status: TaskStatus.DONE, 
      title: 'Done', 
      color: 'success.50',
      textColor: 'success.700',
      borderColor: 'success.200'
    },
  ];

  return (
    <Box>
      {/* Board Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        backgroundColor: 'white',
        borderRadius: 3,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            Task Board
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track your project tasks • {tasks.length} total tasks
          </Typography>
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
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}
        >
          New Task
        </Button>
      </Box>

      {/* Kanban Board */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        overflowX: 'auto', 
        pb: 3,
        minHeight: '600px'
      }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter(task => task.status === column.status);
          
          return (
            <Paper
              key={column.status}
              sx={{
                minWidth: 320,
                backgroundColor: column.color,
                p: 3,
                flex: 1,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 3,
                pb: 2,
                borderBottom: '2px solid',
                borderColor: column.borderColor
              }}>
                <Typography 
                  variant="h6" 
                  fontWeight="600"
                  color={column.textColor}
                >
                  {column.title}
                </Typography>
                <Chip 
                  label={columnTasks.length} 
                  size="small"
                  sx={{ 
                    backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                    color: 'text.secondary',
                    fontWeight: '600'
                  }}
                />
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                flex: 1
              }}>
                {columnTasks.map((task) => (
                  <Card 
                    key={task.id}
                    sx={{ 
                      cursor: 'grab',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            flex: 1, 
                            mr: 1,
                            fontWeight: '600',
                            lineHeight: 1.3
                          }}
                        >
                          {task.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskMenuOpen(e, task);
                          }}
                          sx={{
                            backgroundColor: 'action.hover',
                            '&:hover': {
                              backgroundColor: 'action.selected'
                            }
                          }}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Box>

                      {task.description && (
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
                          {task.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            icon={<FlagIcon sx={{ fontSize: 16 }} />}
                            label={getPriorityLabel(task.priority)}
                            color={getPriorityColor(task.priority) as any}
                            size="small"
                            sx={{ 
                              fontWeight: '500',
                              borderRadius: 1.5
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon sx={{ 
                            color: 'text.secondary', 
                            fontSize: 20,
                            width: 20,
                            height: 20
                          }} />
                          <Typography 
                            variant="caption" 
                            color={isOverdue(task.due_date) ? 'error' : 'text.secondary'}
                            fontWeight={isOverdue(task.due_date) ? '600' : '400'}
                            sx={{ fontSize: '0.8rem' }}
                          >
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date) && ' • Overdue'}
                          </Typography>
                        </Box>

                        {task.assignee_details && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ 
                              color: 'text.secondary', 
                              fontSize: 20,
                              width: 20,
                              height: 20
                            }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              {task.assignee_details.first_name} {task.assignee_details.last_name}
                            </Typography>
                          </Box>
                        )}

                        {task.subtask_count > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            {task.subtask_count} subtask{task.subtask_count !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                {columnTasks.length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                      No tasks in {column.title.toLowerCase()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Create Task Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="sm" 
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
          Create New Task
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="Task Title"
              required
              fullWidth
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              placeholder="Enter task title"
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
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              placeholder="Describe the task details"
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
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={taskData.status}
                  label="Status"
                  onChange={(e) => setTaskData({ ...taskData, status: e.target.value as TaskStatus })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={TaskStatus.BACKLOG}>Backlog</MenuItem>
                  <MenuItem value={TaskStatus.TODO}>To Do</MenuItem>
                  <MenuItem value={TaskStatus.IN_PROGRESS}>In Progress</MenuItem>
                  <MenuItem value={TaskStatus.IN_REVIEW}>In Review</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={taskData.priority}
                  label="Priority"
                  onChange={(e) => setTaskData({ ...taskData, priority: e.target.value as TaskPriority })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={TaskPriority.LOW}>Low</MenuItem>
                  <MenuItem value={TaskPriority.MEDIUM}>Medium</MenuItem>
                  <MenuItem value={TaskPriority.HIGH}>High</MenuItem>
                  <MenuItem value={TaskPriority.URGENT}>Urgent</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={taskData.due_date}
              onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                } 
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            disabled={loading}
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
            onClick={handleCreateTask} 
            variant="contained"
            disabled={!taskData.title.trim() || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Context Menu */}
      <Menu
        anchorEl={taskMenuAnchor}
        open={Boolean(taskMenuAnchor)}
        onClose={handleTaskMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }
        }}
      >
        <MenuItem onClick={handleTaskMenuClose}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem onClick={handleTaskMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Task
        </MenuItem>
        
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Move to:
        </Typography>
        
        {columns.map((column) => (
          selectedTask && selectedTask.status !== column.status && (
            <MenuItem 
              key={column.status}
              onClick={() => handleStatusChange(selectedTask.id, column.status)}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: column.textColor
                  }}
                />
              </ListItemIcon>
              {column.title}
            </MenuItem>
          )
        ))}
        
        <Divider />
        
        <MenuItem 
          onClick={handleDeleteTask}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Task
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
            alignItems: 'center'
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskBoard;