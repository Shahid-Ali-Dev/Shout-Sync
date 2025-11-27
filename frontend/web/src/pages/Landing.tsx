import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Rocket as RocketIcon,
  Groups as TeamsIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Handshake as CollabIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const features = [
    {
      icon: <TeamsIcon sx={{ fontSize: 40 }} />,
      title: 'Team Management',
      description: 'Create and manage teams with role-based permissions and member invitations.',
      color: 'primary',
      benefits: ['Create unlimited teams', 'Role-based access control', 'Member invitations']
    },
    {
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      title: 'Project Tracking',
      description: 'Organize projects, tasks, and subtasks with multiple views and progress tracking.',
      color: 'secondary',
      benefits: ['Kanban & List views', 'Progress tracking', 'Deadline management']
    },
    {
      icon: <CollabIcon sx={{ fontSize: 40 }} />,
      title: 'Real-time Collaboration',
      description: 'Chat with team members, comment on tasks, and stay updated in real-time.',
      color: 'success',
      benefits: ['Team chat', 'Task comments', '@mentions']
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with encrypted data and reliable infrastructure.',
      color: 'warning',
      benefits: ['Data encryption', '99.9% uptime', 'Secure backups']
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager",
      company: "TechCorp",
      content: "Shout Sync transformed how our remote team collaborates. We're 40% more productive!",
      avatar: "SC"
    },
    {
      name: "Marcus Johnson",
      role: "Development Lead",
      company: "StartUp Inc",
      content: "The project management features are incredible. Our release cycles are twice as fast now.",
      avatar: "MJ"
    },
    {
      name: "Elena Rodriguez",
      role: "Creative Director",
      company: "Design Studio",
      content: "Finally, a tool that understands creative workflows. Our team loves the intuitive interface.",
      avatar: "ER"
    }
  ];

  const stats = [
    { number: "10+", label: "Active Teams" },
    { number: "50+", label: "Projects Managed" },
    { number: "200+", label: "Tasks Completed" },
    { number: "99.9%", label: "Uptime Reliability" }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 220, 255, 0.2) 0%, transparent 50%)
          `,
          opacity: 0.6,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Navigation Bar */}
        <Box sx={{ 
          py: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="https://res.cloudinary.com/dru5oqalj/image/upload/v1763829106/Asset_22_mpsg9e.png"
              alt="Shout Sync Logo"
              sx={{
                height: 40,
                width: 40,
                borderRadius: 2,
                padding: 0.5
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'white',
                fontSize: { xs: '1.25rem', md: '1.5rem' }
              }}
            >
              Shout Sync
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isAuthenticated ? (
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>

        {/* Hero Section */}
        <Box sx={{ 
          py: { xs: 8, md: 12 },
          textAlign: 'center',
          color: 'white'
        }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(45deg, #fff 30%, #f0f4ff 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1.1
            }}
          >
            Work Together,
            <Box component="span" sx={{ display: 'block' }}>
              Achieve More
            </Box>
          </Typography>
          
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.75rem' },
              fontWeight: 300,
              mb: 4,
              opacity: 0.9,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.4
            }}
          >
            The ultimate workspace platform for teams to collaborate, manage projects, and achieve goals together.
          </Typography>

          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            mt: 4
          }}>
            {isAuthenticated ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                startIcon={<DashboardIcon />}
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                  boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
                  minWidth: { xs: '200px', sm: 'auto' },
                  '&:hover': {
                    background: 'linear-gradient(45deg, #3a9df5 0%, #00d9e6 100%)',
                    boxShadow: '0 12px 35px rgba(79, 172, 254, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Continue to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  startIcon={<RocketIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
                    minWidth: { xs: '200px', sm: 'auto' },
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FF5252 30%, #FF7B42 90%)',
                      boxShadow: '0 12px 35px rgba(255, 107, 107, 0.4)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Get Started Free
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderColor: 'white',
                    color: 'white',
                    minWidth: { xs: '200px', sm: 'auto' },
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Sign In
                </Button>
              </>
            )}
          </Box>

          {/* Stats Section */}
          <Grid container spacing={3} sx={{ mt: 8, mb: 4 }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      background: 'linear-gradient(45deg, #fff 30%, #f0f4ff 90%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 1
                    }}
                  >
                    {stat.number}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', md: '1rem' } }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: { xs: 6, md: 10 } }}>
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              color: 'white',
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 2
            }}
          >
            Everything Your Team Needs
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 6,
              maxWidth: '600px',
              mx: 'auto',
              fontSize: { xs: '1rem', md: '1.25rem' }
            }}
          >
            Powerful features designed to streamline your team's workflow and boost productivity
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          flexShrink: 0
                        }}
                      >
                        {feature.icon}
                      </Box>
                      
                      <Box>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2,
                            fontSize: { xs: '1.25rem', md: '1.5rem' }
                          }}
                        >
                          {feature.title}
                        </Typography>
                        
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            opacity: 0.8,
                            lineHeight: 1.6,
                            mb: 2,
                            fontSize: { xs: '0.9rem', md: '1rem' }
                          }}
                        >
                          {feature.description}
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <Box key={benefitIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckIcon sx={{ fontSize: 16, color: '#4ade80' }} />
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {benefit}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Testimonials Section */}
        <Box sx={{ py: { xs: 6, md: 10 } }}>
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              color: 'white',
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 2
            }}
          >
            Loved by Teams Worldwide
          </Typography>

          <Grid container spacing={3} sx={{ mt: 4 }}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      background: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontStyle: 'italic',
                        mb: 3,
                        lineHeight: 1.6,
                        opacity: 0.9
                      }}
                    >
                      "{testimonial.content}"
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        {testimonial.avatar}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {testimonial.role}, {testimonial.company}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box sx={{ 
          py: { xs: 8, md: 12 },
          textAlign: 'center'
        }}>
          <Paper
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white'
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 700,
                mb: 2
              }}
            >
              {isAuthenticated ? 'Ready to Continue Your Journey?' : 'Ready to Transform Your Team\'s Workflow?'}
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                opacity: 0.8,
                mb: 4,
                fontSize: { xs: '1rem', md: '1.25rem' },
                maxWidth: '600px',
                mx: 'auto'
              }}
            >
              {isAuthenticated 
                ? `Welcome back, ${user?.first_name}! Pick up where you left off and keep your team moving forward.`
                : 'Join thousands of teams already using Shout Sync to collaborate more effectively.'
              }
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              startIcon={isAuthenticated ? <DashboardIcon /> : <RocketIcon />}
              sx={{
                borderRadius: 3,
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
                minWidth: '200px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #3a9df5 0%, #00d9e6 100%)',
                  boxShadow: '0 12px 35px rgba(79, 172, 254, 0.4)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
            </Button>
          </Paper>
        </Box>

        {/* Footer */}
        <Box sx={{ 
          py: 4, 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <Typography variant="body2">
            © 2025 Shout Sync. A Shout OTB Production. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Landing;