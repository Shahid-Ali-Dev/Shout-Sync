// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import SmartSidebar from './SmartSidebar';
import MobileBottomNavigation from './BottomNavigation';
import CommonHeader from '../components/CommonHeader';

interface MainLayoutProps {
  children?: React.ReactNode;
  headerProps?: {
    title?: string;
    subtitle?: string;
    showBackButton?: boolean;
    backButtonPath?: string;
    customActions?: React.ReactNode;
    showUserInfo?: boolean;
    variant?: 'default' | 'dashboard' | 'page';
  };
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, headerProps = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const {
    title,
    subtitle,
    showBackButton = false,
    backButtonPath,
    customActions,
    showUserInfo = true,
    variant = 'default'
  } = headerProps;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <SmartSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'persistent'}
      />

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          marginLeft: isMobile ? 0 : '72px', // Account for collapsed sidebar
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Header - Only show if headerProps are provided */}
        {(title || customActions) && (
          <CommonHeader 
            title={title}
            subtitle={subtitle}
            showBackButton={showBackButton}
            backButtonPath={backButtonPath}
            customActions={customActions}
            showUserInfo={showUserInfo}
            variant={variant}
            onMenuClick={handleSidebarToggle}
            sx={{ 
              backgroundColor: 'white',
              borderBottom: `1px solid ${theme.palette.divider}`,
              flexShrink: 0,
            }}
          />
        )}

        {/* Page Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          pb: isMobile ? 8 : 0, // Space for bottom navigation on mobile
        }}>
          {children || <Outlet />}
        </Box>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNavigation />
      </Box>
    </Box>
  );
};

export default MainLayout;