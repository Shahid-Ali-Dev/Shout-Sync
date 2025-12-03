// src/components/RecentActivity.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  MoveToInbox as TransferIcon,
  Add as CreateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as MemberIcon,
  Task as TaskIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { projectAPI } from '../shared/services/projectAPI';

interface Activity {
  id: string;
  user_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  team_name: string;
  project_name?: string;
  action_type: number;
  description: string;
  details: any;
  created_at: string;
  time_ago: string;
}

const ACTION_ICONS = {
  1: <TransferIcon color="primary" />, // PROJECT_TRANSFERRED
  2: <EditIcon color="info" />,        // PROJECT_UPDATED
  3: <DeleteIcon color="error" />,     // PROJECT_DELETED
  4: <CreateIcon color="success" />,   // TASK_CREATED
  5: <EditIcon color="warning" />,     // TASK_UPDATED
  6: <DeleteIcon color="error" />,     // TASK_DELETED
  7: <MemberIcon color="success" />,   // TEAM_JOINED
  8: <MemberIcon color="info" />,      // MEMBER_ADDED
  9: <MemberIcon color="error" />,     // MEMBER_REMOVED
};

interface RecentActivityProps {
  teamId: string;
  limit?: number;
  showRefresh?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  teamId, 
  limit = 10,
  showRefresh = true 
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getRecentActivity(teamId, limit);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [teamId, limit]);

  const getActionColor = (actionType: number) => {
    switch (actionType) {
      case 1: return 'primary';    // Transfer
      case 2: return 'info';       // Update
      case 3: return 'error';      // Delete
      case 4: return 'success';    // Create
      case 7: return 'success';    // Join
      case 8: return 'info';       // Add member
      case 9: return 'error';      // Remove member
      default: return 'default';
    }
  };

  const formatActivityMessage = (activity: Activity) => {
    const userName = `${activity.user_details.first_name} ${activity.user_details.last_name}`;
    
    switch (activity.action_type) {
      case 1: // Project transferred
        return {
          primary: `${userName} transferred project`,
          secondary: activity.description,
          highlight: activity.details?.target_team_name || 'another team'
        };
      case 2: // Project updated
        return {
          primary: `${userName} updated project`,
          secondary: activity.project_name || 'a project',
          highlight: null
        };
      case 3: // Project deleted
        return {
          primary: `${userName} deleted project`,
          secondary: activity.details?.project_name || 'a project',
          highlight: null
        };
      case 4: // Task created
        return {
          primary: `${userName} created a task`,
          secondary: activity.project_name || 'a project',
          highlight: null
        };
      case 7: // Team joined
        return {
          primary: `${userName} joined the team`,
          secondary: 'Welcome to the team!',
          highlight: null
        };
      default:
        return {
          primary: activity.description,
          secondary: '',
          highlight: null
        };
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No recent activity
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography variant="h6" fontWeight={600}>
          Recent Activity
        </Typography>
        {showRefresh && (
          <IconButton 
            onClick={loadActivities} 
            size="small" 
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Box>
      
      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
        {activities.map((activity) => {
          const message = formatActivityMessage(activity);
          const icon = ACTION_ICONS[activity.action_type as keyof typeof ACTION_ICONS] || 
                       <CreateIcon color="action" />;
          
          return (
            <ListItem 
              key={activity.id}
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" component="span">
                      {message.primary}
                    </Typography>
                    {message.highlight && (
                      <Chip 
                        label={message.highlight} 
                        size="small" 
                        color={getActionColor(activity.action_type) as any}
                        variant="outlined"
                      />
                    )}
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ ml: 'auto' }}
                    >
                      {activity.time_ago}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Avatar 
                      src={activity.user_details.avatar}
                      sx={{ width: 20, height: 20, fontSize: '0.75rem' }}
                    >
                      {activity.user_details.first_name?.[0]}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      {activity.user_details.first_name} • {message.secondary}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};

export default RecentActivity;