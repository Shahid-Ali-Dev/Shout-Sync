// src/pages/CreateTeamPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Groups as TeamsIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Rocket as RocketIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import CommonHeader from '../components/CommonHeader';
import MainLayout from '../Layout/MainLayout';

interface TeamFormData {
  name: string;
  description: string;
  settings: {
    security: {
      allow_public_invites: boolean;
      require_approval: boolean;
      default_role: number;
      allow_guest_access: boolean;
    };
    features: {
      enable_team_analytics: boolean;
      enable_file_sharing: boolean;
      max_file_size: number;
      enable_team_chat: boolean;
    };
    permissions: {
      members_can_create_projects: boolean;
      members_can_invite: boolean;
      guests_can_view: boolean;
    };
  };
}

const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [teamData, setTeamData] = useState<TeamFormData>({
    name: '',
    description: '',
    settings: {
      security: {
        allow_public_invites: false,
        require_approval: true,
        default_role: 3, // Member
        allow_guest_access: false,
      },
      features: {
        enable_team_analytics: true,
        enable_file_sharing: true,
        max_file_size: 100,
        enable_team_chat: true,
      },
      permissions: {
        members_can_create_projects: false,
        members_can_invite: false,
        guests_can_view: true,
      },
    },
  });

  const steps = [
    {
      label: 'Basic Information',
      description: 'Set up your team name and description',
      icon: <DescriptionIcon />,
    },
    {
      label: 'Security Settings',
      description: 'Configure team security and access',
      icon: <SecurityIcon />,
    },
    {
      label: 'Features & Permissions',
      description: 'Enable features and set permissions',
      icon: <SettingsIcon />,
    },
    {
      label: 'Review & Create',
      description: 'Review your settings and create team',
      icon: <CheckCircleIcon />,
    },
  ];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [category, subfield] = field.split('.');
      setTeamData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [category]: {
            ...prev.settings[category as keyof typeof prev.settings],
            [subfield]: value
          }
        }
      }));
    } else {
      setTeamData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return teamData.name.trim().length >= 3;
      case 1:
        return true; // Security settings always valid
      case 2:
        return true; // Features always valid
      case 3:
        return teamData.name.trim().length >= 3;
      default:
        return false;
    }
  };

  const handleCreateTeam = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);
      setError(null);

      // First create the team with basic info
      const teamResponse = await teamAPI.createTeam({
        name: teamData.name,
        description: teamData.description,
      });

      const teamId = teamResponse.data.id;

      // Then update the team settings
      await teamAPI.updateTeam(teamId, {
        settings: teamData.settings
      });

      setSuccess(true);
      
      // Redirect to the new team page after a short delay
      setTimeout(() => {
        navigate(`/team/${teamId}`);
      }, 2000);

    } catch (error: any) {
      console.error('Failed to create team:', error);
      setError(error.response?.data?.error || 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Team Name"
              required
              fullWidth
              value={teamData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your team name"
              helperText="Choose a descriptive name for your team (min. 3 characters)"
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                } 
              }}
            />
            <TextField
              label="Description"
              multiline
              rows={4}
              fullWidth
              value={teamData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your team's purpose and goals..."
              helperText="This helps team members understand the team's objectives"
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                } 
              }}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security & Access
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Default Member Role</InputLabel>
                <Select
                  value={teamData.settings.security.default_role}
                  label="Default Member Role"
                  onChange={(e) => handleInputChange('security.default_role', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={2}>Admin</MenuItem>
                  <MenuItem value={3}>Member</MenuItem>
                  <MenuItem value={4}>Guest</MenuItem>
                </Select>
                <FormHelperText>
                  Default role for new members when they join
                </FormHelperText>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label="Require Approval"
                  color={teamData.settings.security.require_approval ? "primary" : "default"}
                  variant={teamData.settings.security.require_approval ? "filled" : "outlined"}
                  onClick={() => handleInputChange('security.require_approval', !teamData.settings.security.require_approval)}
                  clickable
                />
                <Chip
                  label="Allow Guest Access"
                  color={teamData.settings.security.allow_guest_access ? "primary" : "default"}
                  variant={teamData.settings.security.allow_guest_access ? "filled" : "outlined"}
                  onClick={() => handleInputChange('security.allow_guest_access', !teamData.settings.security.allow_guest_access)}
                  clickable
                />
                <Chip
                  label="Public Invites"
                  color={teamData.settings.security.allow_public_invites ? "primary" : "default"}
                  variant={teamData.settings.security.allow_public_invites ? "filled" : "outlined"}
                  onClick={() => handleInputChange('security.allow_public_invites', !teamData.settings.security.allow_public_invites)}
                  clickable
                />
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Features & Permissions
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Enable Features
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Team Analytics"
                  color={teamData.settings.features.enable_team_analytics ? "primary" : "default"}
                  variant={teamData.settings.features.enable_team_analytics ? "filled" : "outlined"}
                  onClick={() => handleInputChange('features.enable_team_analytics', !teamData.settings.features.enable_team_analytics)}
                  clickable
                />
                <Chip
                  label="File Sharing"
                  color={teamData.settings.features.enable_file_sharing ? "primary" : "default"}
                  variant={teamData.settings.features.enable_file_sharing ? "filled" : "outlined"}
                  onClick={() => handleInputChange('features.enable_file_sharing', !teamData.settings.features.enable_file_sharing)}
                  clickable
                />
                <Chip
                  label="Team Chat"
                  color={teamData.settings.features.enable_team_chat ? "primary" : "default"}
                  variant={teamData.settings.features.enable_team_chat ? "filled" : "outlined"}
                  onClick={() => handleInputChange('features.enable_team_chat', !teamData.settings.features.enable_team_chat)}
                  clickable
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Member Permissions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Create Projects"
                  color={teamData.settings.permissions.members_can_create_projects ? "primary" : "default"}
                  variant={teamData.settings.permissions.members_can_create_projects ? "filled" : "outlined"}
                  onClick={() => handleInputChange('permissions.members_can_create_projects', !teamData.settings.permissions.members_can_create_projects)}
                  clickable
                />
                <Chip
                  label="Invite Members"
                  color={teamData.settings.permissions.members_can_invite ? "primary" : "default"}
                  variant={teamData.settings.permissions.members_can_invite ? "filled" : "outlined"}
                  onClick={() => handleInputChange('permissions.members_can_invite', !teamData.settings.permissions.members_can_invite)}
                  clickable
                />
                <Chip
                  label="Guest View Access"
                  color={teamData.settings.permissions.guests_can_view ? "primary" : "default"}
                  variant={teamData.settings.permissions.guests_can_view ? "filled" : "outlined"}
                  onClick={() => handleInputChange('permissions.guests_can_view', !teamData.settings.permissions.guests_can_view)}
                  clickable
                />
              </Box>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Max File Size (MB)</InputLabel>
                <Select
                  value={teamData.settings.features.max_file_size}
                  label="Max File Size (MB)"
                  onChange={(e) => handleInputChange('features.max_file_size', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={10}>10 MB</MenuItem>
                  <MenuItem value={50}>50 MB</MenuItem>
                  <MenuItem value={100}>100 MB</MenuItem>
                  <MenuItem value={500}>500 MB</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Review your team configuration before creating.
            </Alert>

            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Name:</Typography>
                    <Typography variant="body2" fontWeight="600">{teamData.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Description:</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ maxWidth: '60%', textAlign: 'right' }}>
                      {teamData.description || 'No description'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Default Role:</Typography>
                    <Typography variant="body2" fontWeight="600">
                      {teamData.settings.security.default_role === 2 ? 'Admin' : 
                       teamData.settings.security.default_role === 3 ? 'Member' : 'Guest'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Approval Required: ${teamData.settings.security.require_approval ? 'Yes' : 'No'}`}
                color={teamData.settings.security.require_approval ? "primary" : "default"}
                size="small"
              />
              <Chip 
                label={`Public Invites: ${teamData.settings.security.allow_public_invites ? 'Yes' : 'No'}`}
                color={teamData.settings.security.allow_public_invites ? "primary" : "default"}
                size="small"
              />
              <Chip 
                label={`Team Chat: ${teamData.settings.features.enable_team_chat ? 'Enabled' : 'Disabled'}`}
                color={teamData.settings.features.enable_team_chat ? "primary" : "default"}
                size="small"
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
            <Typography variant="h3" gutterBottom fontWeight="700">
              Team Created Successfully!
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Your team "{teamData.name}" has been created and is ready to use.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Redirecting to your new team workspace...
            </Typography>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                mx: 'auto',
                mb: 3,
                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <RocketIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h3" gutterBottom fontWeight="700">
              Create New Team
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Set up your team workspace in a few simple steps
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Paper 
            sx={{ 
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {/* Stepper */}
            <Box sx={{ p: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      icon={step.icon}
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontWeight: 600,
                        }
                      }}
                    >
                      {!isMobile && step.label}
                    </StepLabel>
                    {isMobile && (
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                        {renderStepContent(activeStep)}
                      </StepContent>
                    )}
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Step Content for Desktop */}
            {!isMobile && (
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom fontWeight="600">
                  {steps[activeStep].label}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {steps[activeStep].description}
                </Typography>
                
                {renderStepContent(activeStep)}
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0 || loading}
                  sx={{ 
                    borderRadius: 2,
                    px: 4,
                    textTransform: 'none',
                    fontWeight: '600'
                  }}
                >
                  Back
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    onClick={handleCreateTeam}
                    disabled={!validateStep(activeStep) || loading}
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <TeamsIcon />}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      textTransform: 'none',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    {loading ? 'Creating Team...' : 'Create Team'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!validateStep(activeStep)}
                    variant="contained"
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      textTransform: 'none',
                      fontWeight: '600'
                    }}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default CreateTeamPage;