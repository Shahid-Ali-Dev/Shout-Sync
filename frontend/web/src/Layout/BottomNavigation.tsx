// src/components/layout/BottomNavigation.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Groups as TeamsIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  Chat as ChatIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const MobileBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', badge: 0 },
    { label: 'Teams', icon: <TeamsIcon />, path: '/teams', badge: 0 },
    { label: 'Create', icon: <AddIcon />, path: '/quick-create', badge: 0 },
    { label: 'Projects', icon: <ProjectIcon />, path: '/projects', badge: 3 },
    { label: 'Chat', icon: <ChatIcon />, path: '/chat', badge: 5 },
  ];

  const currentPath = navigationItems.findIndex(item => 
    location.pathname.startsWith(item.path)
  );

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: theme.zIndex.appBar,
        display: { xs: 'block', md: 'none' },
        borderTop: `1px solid ${theme.palette.divider}`,
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={currentPath}
        onChange={(event, newValue) => {
          navigate(navigationItems[newValue].path);
        }}
        sx={{
          height: 64,
          backgroundColor: theme.palette.background.paper,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '8px 12px',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            opacity: 1,
            transition: 'all 0.2s ease',
          },
        }}
      >
        {navigationItems.map((item, index) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={
              item.badge > 0 ? (
                <Badge 
                  badgeContent={item.badge} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      height: '16px',
                      minWidth: '16px',
                      borderRadius: '8px',
                    }
                  }}
                >
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )
            }
            sx={{
              color: currentPath === index 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary,
              '& .MuiBottomNavigationAction-label': {
                fontSize: currentPath === index ? '0.8rem' : '0.75rem',
                fontWeight: currentPath === index ? 600 : 400,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNavigation;