// src/components/QuickActionsMenu.tsx
import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Rocket as QuickStartIcon,
  Dashboard as DashboardIcon,
  Groups as TeamsIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Lightbulb as SuggestionIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import RocketIcon from '@mui/icons-material/Rocket';
import teamAPI from '../shared/services/teamAPI';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { projectAPI } from '../shared/services/projectAPI';
import { taskAPI } from '../shared/services/taskAPI';

const QuickActionsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickTaskDialog, setQuickTaskDialog] = useState(false);
  const [quickTaskData, setQuickTaskData] = useState({
    title: '',
    description: '',
    priority: 2,
  });
  const [loading, setLoading] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleQuickTask = () => {
    setQuickTaskDialog(true);
    handleMenuClose();
  };

  const handleCreateQuickTask = async () => {
    if (!quickTaskData.title.trim()) return;

    try {
      setLoading(true);
      // Get user's first team and project to assign the task
        const teamsResponse = await teamAPI.getTeams();
      if (teamsResponse.data.length > 0) {
        const team = teamsResponse.data[0];
        const projectsResponse = await projectAPI.getProjects(team.id);
        if (projectsResponse.data.length > 0) {
          const project = projectsResponse.data[0];
          await taskAPI.createTask(team.id, project.id, {
            ...quickTaskData,
            assignee: user?.id,
            status: 1, // Backlog
          });
          
          setQuickTaskDialog(false);
          setQuickTaskData({ title: '', description: '', priority: 2 });
          // Show success message or refresh data
        }
      }
    } catch (error) {
      console.error('Failed to create quick task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickProject = () => {
    // Navigate to project creation with pre-filled data
    navigate('/project/create', { 
      state: { 
        quickStart: true,
        template: 'basic'
      }
    });
    handleMenuClose();
  };

  const handleExportData = async () => {
    try {
      // Export dashboard data as JSON
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          name: `${user?.first_name} ${user?.last_name}`,
          email: user?.email,
        },
        teams: [], // You would populate this with actual data
        projects: [], // You would populate this with actual data
        tasks: [], // You would populate this with actual data
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shout-sync-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    handleMenuClose();
  };

  const handlePerformanceCheck = () => {
    // Implement performance analytics
    const performanceData = {
      loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
      tasksCompleted: 0, // Calculate from actual data
      productivityScore: 85, // Calculate based on user activity
    };
    
    console.log('Performance Check:', performanceData);
    // You could show this in a dialog or notification
    handleMenuClose();
  };

  return (
    <>
      <Tooltip title="Quick Actions">
        <IconButton 
          onClick={handleMenuOpen}
          sx={{
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'grey.50',
            }
          }}
        >
          <SpeedIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { 
            width: 320,
            borderRadius: 2,
            mt: 1,
          }
        }}
      >
        <MenuItem onClick={handleQuickTask}>
          <ListItemIcon>
            <TaskIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Quick Task" 
            secondary="Create a task instantly"
          />
        </MenuItem>

        <MenuItem onClick={handleQuickProject}>
          <ListItemIcon>
            <ProjectIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText 
            primary="Quick Project" 
            secondary="Start a new project"
          />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleExportData}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" color="action" />
          </ListItemIcon>
          <ListItemText 
            primary="Export Data" 
            secondary="Download your workspace data"
          />
        </MenuItem>

        <MenuItem onClick={handlePerformanceCheck}>
          <ListItemIcon>
            <AnalyticsIcon fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText 
            primary="Performance Check" 
            secondary="View your productivity stats"
          />
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => navigate('/templates')}>
          <ListItemIcon>
            <RocketIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText 
            primary="Project Templates" 
            secondary="Start with pre-built templates"
          />
        </MenuItem>
      </Menu>

      {/* Quick Task Dialog */}
      <Dialog 
        open={quickTaskDialog} 
        onClose={() => setQuickTaskDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon color="primary" />
            Create Quick Task
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Task Title"
              value={quickTaskData.title}
              onChange={(e) => setQuickTaskData({ ...quickTaskData, title: e.target.value })}
              placeholder="What needs to be done?"
              fullWidth
              autoFocus
            />
            <TextField
              label="Description (Optional)"
              value={quickTaskData.description}
              onChange={(e) => setQuickTaskData({ ...quickTaskData, description: e.target.value })}
              placeholder="Add more details..."
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickTaskDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateQuickTask}
            variant="contained"
            disabled={!quickTaskData.title.trim() || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickActionsMenu;