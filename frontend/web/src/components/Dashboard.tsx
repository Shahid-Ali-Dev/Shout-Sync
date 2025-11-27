import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Groups as TeamsIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import CommonHeader from './CommonHeader';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_by_name: string;
  project_count?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTeams, setShowAllTeams] = useState(false);
  
  // State for modals
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  // New team form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
  });
  const [creatingTeam, setCreatingTeam] = useState(false);

  const loadTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Team Creation Handler
  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;

    try {
      setCreatingTeam(true);
      await teamAPI.createTeam(newTeam);
      setCreateTeamDialogOpen(false);
      setNewTeam({ name: '', description: '' });
      await loadTeams(); // Reload teams to show the new one
    } catch (error: any) {
      console.error('Failed to create team:', error);
      alert(error.response?.data?.error || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Toggle show all teams
  const toggleShowAllTeams = () => {
    setShowAllTeams(!showAllTeams);
  };

  // Get teams to display based on showAllTeams state
  const getDisplayTeams = () => {
    if (showAllTeams) {
      return teams;
    }
    return teams.slice(0, 4);
  };

  const stats = [
    {
      icon: <TeamsIcon sx={{ fontSize: 32 }} />,
      label: 'Total Teams',
      value: teams.length,
      color: 'primary',
      change: '+2 this month'
    },
    {
      icon: <ProjectIcon sx={{ fontSize: 32 }} />,
      label: 'Active Projects',
      value: teams.reduce((acc, team) => acc + (team.project_count || 0), 0),
      color: 'secondary',
      change: '+5 this week'
    },
    {
      icon: <TaskIcon sx={{ fontSize: 32 }} />,
      label: 'Tasks Assigned',
      value: 24,
      color: 'success',
      change: '12 completed'
    },
    {
      icon: <ScheduleIcon sx={{ fontSize: 32 }} />,
      label: 'Upcoming Deadlines',
      value: 3,
      color: 'warning',
      change: '1 tomorrow'
    },
  ];

  const recentActivities = [
    { 
      id: 1, 
      action: 'Created new project', 
      team: 'Design Team', 
      time: '2 hours ago',
      completed: true
    },
    { 
      id: 2, 
      action: 'Completed task', 
      team: 'Development', 
      time: '5 hours ago',
      completed: true
    },
    { 
      id: 3, 
      action: 'Added new member', 
      team: 'Marketing', 
      time: '1 day ago',
      completed: false
    },
    { 
      id: 4, 
      action: 'Updated project status', 
      team: 'Design Team', 
      time: '2 days ago',
      completed: false
    },
  ];

  const quickActions = [
    {
      icon: <AddIcon />,
      label: 'Create New Team',
      description: 'Start a new team collaboration',
      action: () => setCreateTeamDialogOpen(true),
      color: 'primary'
    },
    {
      icon: <ProjectIcon />,
      label: 'View All Projects',
      description: 'Browse all your projects',
      action: () => navigate('/projects'),
      color: 'secondary'
    },
    {
      icon: <PersonIcon />,
      label: 'Update Profile',
      description: 'Manage your account settings',
      action: () => navigate('/profile'),
      color: 'success'
    },
  ];

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        backgroundColor: '#f8fafc'
      }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
    }}>
      {/* Common Header */}
      <CommonHeader 
        title={`Welcome back, ${user?.first_name || 'User'}!`}
        subtitle="Here's what's happening with your teams today"
      />

      <Container maxWidth="xl" sx={{ 
        px: { xs: 2, sm: 3 }, 
        py: isMobile ? 2 : 4,
        mt: isMobile ? 0 : -2
      }}>
        {/* Stats Grid */}
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        p: { xs: 1.5, md: 2 },
                        borderRadius: 2,
                        backgroundColor: `${stat.color}.50`,
                        color: `${stat.color}.main`
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Chip 
                      label={stat.change} 
                      size="small" 
                      color={stat.color as any}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      mb: 0.5
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', md: '1rem' } }}
                  >
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Teams Section */}
          <Grid item xs={12} lg={8}>
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                backgroundColor: 'white',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid',
                borderColor: 'divider',
                p: { xs: 2, md: 4 }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    Your Teams
                  </Typography>
                  {teams.length > 4 && (
                    <Chip 
                      label={`${teams.length} teams`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                {/* Create Team Button */}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateTeamDialogOpen(true)}
                  sx={{
                    borderRadius: 3,
                    px: { xs: 2, md: 3 },
                    py: { xs: 0.75, md: 1 },
                    textTransform: 'none',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  Create Team
                </Button>
              </Box>

              {teams.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <TeamsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="500">
                    No Teams Yet
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
                    Create your first team to start collaborating with others.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateTeamDialogOpen(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Create Your First Team
                  </Button>
                </Box>
              ) : (
                <>
                  {/* Teams Grid - Show all teams when expanded, only first 4 when collapsed */}
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {getDisplayTeams().map((team) => (
                      <Grid item xs={12} sm={6} key={team.id}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s ease',
                            height: '100%',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 8px 25px rgba(37, 99, 235, 0.15)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                          onClick={() => navigate(`/team/${team.id}`)}
                        >
                          <CardContent sx={{ 
                            p: { xs: 2, md: 3 }, 
                            flex: 1, 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:last-child': { pb: 3 }
                          }}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: 2, 
                              mb: 2,
                              minHeight: '60px'
                            }}>
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  backgroundColor: 'primary.50',
                                  color: 'primary.main',
                                  flexShrink: 0
                                }}
                              >
                                <TeamsIcon />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                  variant="h6" 
                                  fontWeight="600" 
                                  sx={{ 
                                    fontSize: { xs: '1rem', md: '1.125rem' },
                                    lineHeight: 1.3,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    minHeight: '2.6em'
                                  }}
                                >
                                  {team.name}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    mt: 0.5
                                  }}
                                >
                                  {team.member_count} members • {team.project_count || 0} projects
                                </Typography>
                              </Box>
                            </Box>
                            
                            {team.description && (
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  mb: 2,
                                  lineHeight: 1.5,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  minHeight: '2.5em',
                                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                                }}
                              >
                                {team.description}
                              </Typography>
                            )}
                            
                            <Box sx={{ flex: 1 }} />
                            
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              mt: 'auto',
                              pt: 2,
                              borderTop: '1px solid',
                              borderColor: 'divider'
                            }}>
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                  fontSize: { xs: '0.7rem', md: '0.75rem' },
                                  lineHeight: 1.2
                                }}
                              >
                                By {team.created_by_name}
                              </Typography>
                              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* View All / Hide Teams Button */}
                  {teams.length > 4 && (
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Button 
                        variant="outlined"
                        onClick={toggleShowAllTeams}
                        startIcon={showAllTeams ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ 
                          borderRadius: 2,
                          px: 3,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        {showAllTeams ? `Hide Teams` : `View All Teams (${teams.length})`}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>

          {/* Sidebar Section */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
              {/* Quick Actions */}
              <Paper 
                elevation={0}
                sx={{ 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: { xs: 2, md: 3 }
                }}
              >
                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.125rem' } }}>
                  Quick Actions
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {quickActions.map((action, index) => (
                    <Button 
                      key={index}
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        fontWeight: 500,
                        color: 'text.primary',
                        '&:hover': {
                          backgroundColor: `${action.color}.50`,
                          color: `${action.color}.main`
                        }
                      }}
                    >
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight="600">
                          {action.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Box>
              </Paper>

              {/* Recent Activity */}
              <Paper 
                elevation={0}
                sx={{ 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: { xs: 2, md: 3 }
                }}
              >
                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.125rem' } }}>
                  Recent Activity
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recentActivities.map((activity) => (
                    <Box 
                      key={activity.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'grey.50',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'grey.100'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          p: 0.5,
                          borderRadius: '50%',
                          backgroundColor: activity.completed ? 'success.100' : 'primary.100',
                          color: activity.completed ? 'success.main' : 'primary.main'
                        }}
                      >
                        {activity.completed ? (
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="500" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                          {activity.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                          {activity.team} • {activity.time}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Create Team Dialog */}
      <Dialog 
        open={createTeamDialogOpen} 
        onClose={() => setCreateTeamDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          Create New Team
          <IconButton 
            onClick={() => setCreateTeamDialogOpen(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              label="Team Name"
              required
              fullWidth
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              placeholder="Enter team name"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              placeholder="Describe your team's purpose"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setCreateTeamDialogOpen(false)}
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTeam}
            variant="contained"
            disabled={!newTeam.name.trim() || creatingTeam}
            startIcon={creatingTeam ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: '600'
            }}
          >
            {creatingTeam ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;