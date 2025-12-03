// src/pages/TeamsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Groups as TeamsIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Folder as ProjectIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import CommonHeader from '../components/CommonHeader';
import MainLayout from '../Layout/MainLayout';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_by_name: string;
  project_count?: number;
}

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamAPI.getTeams();
      setTeams(response.data);
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          backgroundColor: '#f8fafc'
        }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography 
            variant="h3" 
            fontWeight="700" 
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontSize: { xs: '2rem', md: '2.5rem' }
            }}
          >
            All Teams
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Manage and access all your team workspaces
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'error.light'
            }}
          >
            {error}
          </Alert>
        )}

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4
        }}>
          <TextField
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ 
              minWidth: 300,
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2,
              } 
            }}
            size="small"
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/team/create')}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            Create New Team
          </Button>
        </Box>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TeamsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
            <Typography variant="h4" fontWeight="700" gutterBottom sx={{ 
              background: 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 2
            }}>
              {searchQuery ? 'No Teams Found' : 'No Teams Yet'}
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ 
              mb: 4, 
              maxWidth: 400, 
              mx: 'auto', 
              fontWeight: 400, 
              lineHeight: 1.6 
            }}>
              {searchQuery 
                ? 'No teams match your search. Try different keywords.'
                : 'Start your collaboration journey by creating your first team.'
              }
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/team/create')}
                sx={{ 
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontWeight: '600',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Create Your First Team
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Showing {filteredTeams.length} of {teams.length} teams
            </Typography>

            <Grid container spacing={3}>
              {filteredTeams.map((team) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={team.id}>
                  <Card 
                    sx={{ 
                      borderRadius: 3,
                      backgroundColor: 'white',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.3s ease',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <CardActionArea 
                      sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                      onClick={() => navigate(`/team/${team.id}`)}
                    >
                      <CardContent sx={{ 
                        p: 3, 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        '&:last-child': { pb: 3 }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            backgroundColor: 'primary.50',
                            color: 'primary.main',
                            flexShrink: 0
                          }}>
                            <TeamsIcon />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight="600" sx={{ 
                              fontSize: '1.125rem',
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: '2.6em'
                            }}>
                              {team.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              fontSize: '0.875rem', 
                              mt: 0.5 
                            }}>
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
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              flex: 1
                            }}
                          >
                            {team.description}
                          </Typography>
                        )}
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mt: 'auto',
                          pt: 2,
                          borderTop: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <Typography variant="caption" color="text.secondary">
                            By {team.created_by_name}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default TeamsPage;