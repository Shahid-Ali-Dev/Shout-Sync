// src/components/ActivitySummary.tsx
import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Task as TaskIcon,
  Group as GroupIcon,
  Folder as ProjectIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';

interface ActivitySummaryProps {
  recentActivities: any[];
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ recentActivities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CompleteIcon color="success" />;
      case 'task_created':
        return <TaskIcon color="primary" />;
      case 'project_created':
        return <ProjectIcon color="secondary" />;
      case 'team_joined':
        return <GroupIcon color="info" />;
      default:
        return <ScheduleIcon color="action" />;
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case 'task_completed':
        return `Completed task "${activity.details?.taskTitle}"`;
      case 'task_created':
        return `Created new task in ${activity.details?.projectName}`;
      case 'project_created':
        return `Started new project "${activity.details?.projectName}"`;
      case 'team_joined':
        return `Joined team "${activity.details?.teamName}"`;
      default:
        return activity.message;
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Recent Activity
      </Typography>
      <List sx={{ maxHeight: 200, overflow: 'auto' }}>
        {recentActivities.slice(0, 5).map((activity, index) => (
          <ListItem key={index} sx={{ px: 0, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              {getActivityIcon(activity.type)}
            </ListItemIcon>
            <ListItemText
              primary={getActivityText(activity)}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </Typography>
                  {activity.details?.priority && (
                    <Chip 
                      label={activity.details.priority} 
                      size="small" 
                      color={
                        activity.details.priority === 'High' ? 'error' : 
                        activity.details.priority === 'Medium' ? 'warning' : 'default'
                      }
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ActivitySummary;