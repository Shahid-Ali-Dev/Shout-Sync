// src/components/layout/SmartSidebar.tsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
  Alert,
  Popover,
  Paper,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Groups as TeamsIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Workspaces as WorkspaceIcon,
  Notifications as NotificationIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  ViewTimeline as TimelineIcon,
  TableView as TableViewIcon,
  Assignment as AssignmentIcon,
  Folder as FolderIcon,
  TrendingUp as TrendingIcon,
  Star as StarIcon,
  Lightbulb as IdeaIcon,
  Refresh as RefreshIcon,
  ArrowForwardIos as ArrowForwardIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import { projectAPI } from '../shared/services/projectAPI';
import CreateTeamDialog from '../components/dialogs/CreateTeamDialog';
import CreateProjectDialog from '../components/dialogs/CreateProjectDialog';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: SidebarItem[];
  badge?: number;
  role?: string[];
  isNew?: boolean;
  isPro?: boolean;
  action?: () => void;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  project_count?: number;
}

interface Project {
  id: string;
  name: string;
  team: string;
  status: number;
  team_name?: string;
}

interface SmartSidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'permanent' | 'persistent' | 'temporary';
}

const SmartSidebar: React.FC<SmartSidebarProps> = ({ open, onClose, variant }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['dashboard', 'teams'])
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced state for mini navigation
  const [miniNavAnchor, setMiniNavAnchor] = useState<{
    element: HTMLElement;
    item: SidebarItem;
  } | null>(null);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [selectedTeamForProject, setSelectedTeamForProject] = useState<string>('');

  // Cloudinary logo URL
  const cloudinaryLogo = 'https://res.cloudinary.com/dru5oqalj/image/upload/v1763829106/Asset_22_mpsg9e.png';

  // Load real data from backend
  const loadTeamsAndProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load teams
      const teamsResponse = await teamAPI.getTeams();
      const teamsData = teamsResponse.data;
      setTeams(teamsData);

      // Load recent projects from all teams
      const allProjects: Project[] = [];
      
      // Get projects for each team
      for (const team of teamsData) {
        try {
          const projectsResponse = await projectAPI.getProjects(team.id);
          const teamProjects = projectsResponse.data.map((project: any) => ({
            ...project,
            team_name: team.name
          }));
          allProjects.push(...teamProjects.slice(0, 3)); // Limit to 3 projects per team
        } catch (error) {
          console.error(`Failed to load projects for team ${team.id}:`, error);
        }
      }
      
      setRecentProjects(allProjects.slice(0, 6)); // Show max 6 recent projects
      
    } catch (error: any) {
      console.error('Failed to load sidebar data:', error);
      setError('Failed to load navigation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTeamsAndProjects();
    }
  }, [open]);

  // Auto-close sidebar when screen shrinks to mobile
  useEffect(() => {
    if (isMobile && open) {
      onClose();
    }
  }, [isMobile, open, onClose]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
    setMiniNavAnchor(null);
  };

  const handleRefreshData = () => {
    loadTeamsAndProjects();
  };

  // Enhanced mini navigation handlers
  const handleMiniNavOpen = (event: React.MouseEvent<HTMLElement>, item: SidebarItem) => {
    if (sidebarCollapsed && item.children && item.children.length > 0) {
      setMiniNavAnchor({ element: event.currentTarget, item });
    } else if (item.action) {
      item.action();
    } else if (item.path) {
      handleNavigation(item.path);
    }
  };

  const handleMiniNavClose = () => {
    setMiniNavAnchor(null);
  };

  const handleCreateTeamClick = () => {
    setCreateTeamDialogOpen(true);
    handleMiniNavClose();
  };

  const handleCreateProjectClick = (teamId?: string) => {
    setSelectedTeamForProject(teamId || '');
    setCreateProjectDialogOpen(true);
    handleMiniNavClose();
  };

  const handleTeamCreated = (team: any) => {
    loadTeamsAndProjects();
    navigate(`/team/${team.id}`);
  };

  const handleProjectCreated = (project: any) => {
    loadTeamsAndProjects();
    if (project.team) {
      navigate(`/team/${project.team}/project/${project.id}`);
    }
  };

  // Enhanced sidebar items with actions
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: <TeamsIcon />,
      children: [
        ...teams.map(team => ({
          id: `team-${team.id}`,
          label: team.name,
          icon: <WorkspaceIcon sx={{ fontSize: 18 }} />,
          path: `/team/${team.id}`,
          badge: team.member_count,
        })),
        {
          id: 'all-teams',
          label: 'All Teams',
          icon: <TeamsIcon sx={{ fontSize: 18 }} />,
          path: '/teams',
        },
        {
          id: 'create-team',
          label: 'Create Team',
          icon: <AddIcon sx={{ fontSize: 18 }} />,
          action: () => handleCreateTeamClick(),
          isNew: true,
        },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <ProjectIcon />,
      children: [
        ...recentProjects.map(project => ({
          id: `project-${project.id}`,
          label: project.name,
          icon: <FolderIcon sx={{ fontSize: 18 }} />,
          path: `/team/${project.team}/project/${project.id}`,
        })),
        {
          id: 'all-projects',
          label: 'All Projects',
          icon: <TableViewIcon sx={{ fontSize: 18 }} />,
          path: '/projects',
        },
        {
          id: 'create-project',
          label: 'Create Project',
          icon: <AddIcon sx={{ fontSize: 18 }} />,
          action: () => handleCreateProjectClick(),
        },
      ],
    },
    {
      id: 'my-work',
      label: 'My Work',
      icon: <TaskIcon />,
      children: [
        {
          id: 'assigned-tasks',
          label: 'Assigned Tasks',
          icon: <AssignmentIcon sx={{ fontSize: 18 }} />,
          path: '/my-work/assigned',
          badge: 12,
        },
        {
          id: 'due-soon',
          label: 'Due Soon',
          icon: <ScheduleIcon sx={{ fontSize: 18 }} />,
          path: '/my-work/due-soon',
          badge: 3,
        },
        {
          id: 'in-progress',
          label: 'In Progress',
          icon: <TimelineIcon sx={{ fontSize: 18 }} />,
          path: '/my-work/in-progress',
        },
        {
          id: 'review-needed',
          label: 'Review Needed',
          icon: <NotificationIcon sx={{ fontSize: 18 }} />,
          path: '/my-work/review',
          badge: 2,
        },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      children: [
        {
          id: 'team-chats',
          label: 'Team Chats',
          icon: <ChatIcon sx={{ fontSize: 18 }} />,
          path: '/chat',
          badge: 5,
          isNew: true,
        },
        {
          id: 'mentions',
          label: '@ Mentions',
          icon: <PersonIcon sx={{ fontSize: 18 }} />,
          path: '/mentions',
          badge: 3,
        },
        {
          id: 'announcements',
          label: 'Announcements',
          icon: <NotificationIcon sx={{ fontSize: 18 }} />,
          path: '/announcements',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/analytics',
      role: ['admin', 'owner'],
      isPro: true,
    },
  ];

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const isActive = location.pathname === item.path;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = isSectionExpanded(item.id);
    const isHovered = hoveredItem === item.id;
    const showMiniNav = sidebarCollapsed && hasChildren;

    return (
      <Box key={item.id}>
        <ListItem 
          disablePadding 
          sx={{ 
            display: 'block',
            position: 'relative',
          }}
        >
          <Tooltip 
            title={sidebarCollapsed ? item.label : ''} 
            placement="right"
            arrow
            enterDelay={500}
          >
            <ListItemButton
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(e) => {
                if (showMiniNav) {
                  handleMiniNavOpen(e, item);
                } else if (hasChildren) {
                  toggleSection(item.id);
                } else if (item.action) {
                  item.action();
                } else if (item.path) {
                  handleNavigation(item.path);
                }
              }}
              sx={{
                minHeight: 48,
                justifyContent: sidebarCollapsed ? 'center' : 'initial',
                px: 2.5,
                pl: level > 0 ? 2.5 + level * 2 : 2.5,
                backgroundColor: isActive 
                  ? alpha(theme.palette.primary.main, 0.12)
                  : isHovered
                  ? alpha(theme.palette.primary.main, 0.06)
                  : 'transparent',
                borderRight: isActive ? `3px solid ${theme.palette.primary.main}` : 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&::before': isActive ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '0 2px 2px 0',
                } : {},
                '&:hover': {
                  backgroundColor: isActive 
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.primary.main, 0.08),
                  transform: isHovered && !sidebarCollapsed ? 'translateX(4px)' : 'none',
                },
                '& .hover-glow': {
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                },
              }}
            >
              {/* Hover Glow Effect */}
              <Box
                className="hover-glow"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
                  zIndex: 0,
                }}
              />

              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarCollapsed ? 'auto' : 3,
                  justifyContent: 'center',
                  color: isActive 
                    ? theme.palette.primary.main 
                    : isHovered
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                  position: 'relative',
                  zIndex: 1,
                  transition: 'all 0.2s ease',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {item.badge && item.badge > 0 ? (
                  <Badge 
                    badgeContent={item.badge} 
                    color="error" 
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: '16px',
                        minWidth: '16px',
                        borderRadius: '8px',
                        transform: 'scale(0.9)',
                      }
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              
              {!sidebarCollapsed && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  flex: 1,
                  position: 'relative',
                  zIndex: 1,
                  minWidth: 0,
                }}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2"
                          sx={{
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                            fontSize: '0.9rem',
                            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                            letterSpacing: '-0.01em',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {item.label}
                        </Typography>
                        {item.isNew && (
                          <Chip
                            label="New"
                            size="small"
                            color="primary"
                            sx={{ 
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              fontFamily: '"Inter", sans-serif',
                            }}
                          />
                        )}
                        {item.isPro && (
                          <Chip
                            label="Pro"
                            size="small"
                            color="secondary"
                            sx={{ 
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              fontFamily: '"Inter", sans-serif',
                            }}
                          />
                        )}
                      </Box>
                    }
                    sx={{ my: 0 }}
                  />
                  {hasChildren && (
                    <Box 
                      sx={{ 
                        ml: 1,
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: theme.palette.text.secondary,
                      }}
                    >
                      <ExpandMoreIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
              )}

              {/* Mini Navigation Arrow for Collapsed State */}
              {sidebarCollapsed && hasChildren && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: theme.palette.text.secondary,
                    opacity: 0.6,
                  }}
                >
                  <ArrowForwardIcon sx={{ fontSize: 14 }} />
                </Box>
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        {hasChildren && !sidebarCollapsed && (
          <Collapse 
            in={isExpanded} 
            timeout="auto" 
            unmountOnExit
            sx={{
              '& .MuiCollapse-wrapper': {
                paddingLeft: level * 2,
              }
            }}
          >
            <List component="div" disablePadding sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              {item.children!.map(child => renderSidebarItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  // Enhanced Mini Navigation Popover
  const renderMiniNavigation = () => {
    if (!miniNavAnchor) return null;

    const { item } = miniNavAnchor;

    return (
      <Popover
        open={Boolean(miniNavAnchor)}
        anchorEl={miniNavAnchor.element}
        onClose={handleMiniNavClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'visible',
            ml: 1,
            minWidth: 240,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -6,
              top: 20,
              width: 12,
              height: 12,
              backgroundColor: 'white',
              transform: 'rotate(45deg)',
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }
          }
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ mb: 2, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography 
              variant="subtitle1" 
              fontWeight="700" 
              sx={{ 
                fontFamily: '"Inter", sans-serif',
                fontSize: '1rem',
                color: theme.palette.text.primary,
              }}
            >
              {item.label}
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Stack spacing={0.5}>
            {item.children?.map((child) => (
              <ListItemButton
                key={child.id}
                onClick={() => {
                  if (child.action) {
                    child.action();
                  } else if (child.path) {
                    handleNavigation(child.path);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  minHeight: 'auto',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  {child.icon}
                </ListItemIcon>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '0.875rem',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {child.label}
                  </Typography>
                </Box>
                {child.badge && child.badge > 0 && (
                  <Badge 
                    badgeContent={child.badge} 
                    color="error" 
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: '16px',
                        minWidth: '16px',
                        borderRadius: '8px',
                      }
                    }}
                  />
                )}
                {(child.isNew || child.isPro) && (
                  <Chip
                    label={child.isNew ? "New" : "Pro"}
                    size="small"
                    color={child.isNew ? "primary" : "secondary"}
                    sx={{ 
                      ml: 1,
                      height: 18,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                    }}
                  />
                )}
              </ListItemButton>
            ))}
          </Stack>
        </Paper>
      </Popover>
    );
  };

  const drawerContent = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
      borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.2)} 50%, transparent 100%)`,
      }
    }}>

    {/* Header */}
    <Box sx={{ 
      p: 2, 
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: sidebarCollapsed ? 'center' : 'space-between',
      minHeight: 64,
      position: 'relative',
      background: alpha(theme.palette.background.paper, 0.8),
    }}>
      {!sidebarCollapsed ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              // REMOVED: background gradient and shadow
            }}
          >
            <img 
              src={cloudinaryLogo} 
              alt="Shout Sync" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain', // Changed from 'cover' to 'contain' for better logo display
                borderRadius: '8px'
              }}
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </Box>
          <Box>
            <Typography 
              variant="h6" 
              fontWeight="800" 
              sx={{ 
                lineHeight: 1, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, 
                backgroundClip: 'text', 
                WebkitBackgroundClip: 'text', 
                color: 'transparent',
                fontFamily: '"Inter", "Roboto", sans-serif',
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
              }}
            >
              Shout Sync
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 500,
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.75rem',
              }}
            >
              Team Workspace
            </Typography>
          </Box>
        </Box>
      ) : (
        <Tooltip title="Shout Sync" placement="right" arrow>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              }
            }}
            onClick={() => navigate('/dashboard')}
          >
            <img 
              src={cloudinaryLogo} 
              alt="Shout Sync" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain', // Changed from 'cover' to 'contain'
                borderRadius: '8px'
              }}
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </Box>
        </Tooltip>
      )}
      
      {!isMobile && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Refresh data" arrow>
            <IconButton 
              size="small"
              onClick={handleRefreshData}
              disabled={loading}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
                transition: 'all 0.2s ease',
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} arrow>
            <IconButton 
              size="small"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ fontSize: '0.75rem', py: 0.5, fontFamily: '"Inter", sans-serif' }}>
            {error}
          </Alert>
        </Box>
      )}

      {/* User Info - Only show when expanded */}
      {!sidebarCollapsed && user && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`, background: alpha(theme.palette.background.paper, 0.6) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: theme.palette.primary.main,
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography 
                variant="subtitle2" 
                fontWeight="700" 
                noWrap
                sx={{ fontFamily: '"Inter", sans-serif' }}
              >
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                noWrap 
                sx={{ 
                  fontWeight: 500,
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                {user?.email}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Chip
              label="Online"
              size="small"
              color="success"
              variant="filled"
              sx={{ 
                height: 22, 
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              }}
            />
            <Chip
              label="Pro"
              size="small"
              color="primary"
              sx={{ 
                height: 22, 
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
              }}
            />
          </Box>
        </Box>
      )}

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {!loading && !error && (
          <List sx={{ px: 1 }}>
            {sidebarItems.map(item => renderSidebarItem(item))}
          </List>
        )}
      </Box>

      {/* Quick Actions - Only show when expanded */}
      {!sidebarCollapsed && !loading && (
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, background: alpha(theme.palette.background.paper, 0.8) }}>
          <Typography 
            variant="caption" 
            fontWeight="700" 
            color="text.secondary" 
            sx={{ 
              mb: 1, 
              display: 'block', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.75rem',
            }}
          >
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <ListItemButton
              sx={{
                borderRadius: 2,
                py: 1,
                px: 1.5,
                minHeight: 'auto',
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  transform: 'translateX(2px)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleCreateProjectClick()}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <AddIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    New Project
                  </Typography>
                }
              />
            </ListItemButton>
            <ListItemButton
              sx={{
                borderRadius: 2,
                py: 1,
                px: 1.5,
                minHeight: 'auto',
                backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  transform: 'translateX(2px)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleCreateTeamClick()}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <TeamsIcon fontSize="small" color="secondary" />
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: theme.palette.secondary.main,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    New Team
                  </Typography>
                }
              />
            </ListItemButton>
          </Box>
        </Box>
      )}

      {/* Settings - Always visible but compact when collapsed */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, background: alpha(theme.palette.background.paper, 0.9) }}>
        <ListItemButton
          onClick={() => handleNavigation('/settings')}
          sx={{
            borderRadius: 2,
            justifyContent: sidebarCollapsed ? 'center' : 'initial',
            px: sidebarCollapsed ? 1 : 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              transform: sidebarCollapsed ? 'scale(1.1)' : 'translateX(2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: sidebarCollapsed ? 0 : 2,
              justifyContent: 'center',
              color: theme.palette.primary.main,
              transition: 'color 0.2s ease',
              '&:hover': {
                color: theme.palette.primary.dark,
              }
            }}
          >
            <SettingsIcon />
          </ListItemIcon>
          {!sidebarCollapsed && (
            <ListItemText 
              primary={
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    fontFamily: '"Inter", sans-serif',
                    transition: 'color 0.2s ease',
                  }}
                >
                  Settings
                </Typography>
              }
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ 
            keepMounted: true,
            sx: {
              '& .MuiBackdrop-root': {
                backgroundColor: alpha(theme.palette.common.black, 0.5),
                backdropFilter: 'blur(4px)',
              }
            }
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: `0 0 40px ${alpha(theme.palette.common.black, 0.2)}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Dialogs */}
        <CreateTeamDialog
          open={createTeamDialogOpen}
          onClose={() => setCreateTeamDialogOpen(false)}
          onTeamCreated={handleTeamCreated}
        />

        <CreateProjectDialog
          open={createProjectDialogOpen}
          onClose={() => setCreateProjectDialogOpen(false)}
          onProjectCreated={handleProjectCreated}
          teamId={selectedTeamForProject}
        />
      </>
    );
  }

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarCollapsed ? 80 : 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarCollapsed ? 80 : 300,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: `0 0 20px ${alpha(theme.palette.common.black, 0.1)}`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            '&:hover': {
              boxShadow: `0 0 30px ${alpha(theme.palette.common.black, 0.15)}`,
            },
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mini Navigation Popover */}
      {renderMiniNavigation()}

      {/* Dialogs */}
      <CreateTeamDialog
        open={createTeamDialogOpen}
        onClose={() => setCreateTeamDialogOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      <CreateProjectDialog
        open={createProjectDialogOpen}
        onClose={() => setCreateProjectDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
        teamId={selectedTeamForProject}
      />
    </>
  );
};

export default SmartSidebar;