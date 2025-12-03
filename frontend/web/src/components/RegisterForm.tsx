import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  Fade,
  Zoom,
  InputAdornment,
  IconButton,
  Divider,
  Grid,
  Chip,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Rocket as RocketIcon,
  Groups as TeamsIcon,
} from '@mui/icons-material';
import { register, clearError } from '../shared/store/slices/authSlice';
import { RootState, AppDispatch } from '../shared/store/store';
import { authAPI } from '../shared/services/api';

const RegisterForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const invitationEmail = searchParams.get('email');
  const invitationToken = searchParams.get('token');

  const [formData, setFormData] = useState({
    email: invitationEmail || '',
    username: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' 
  });

  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [processingInvitations, setProcessingInvitations] = useState(false);

  // Check for pending invitations when component loads
  useEffect(() => {
    const checkPendingInvitations = async () => {
      if (invitationEmail) {
        try {
          const response = await authAPI.checkPendingInvitations(invitationEmail);
          if (response.data.count > 0) {
            setPendingInvitations(response.data.pending_invitations || []);
          }
        } catch (error) {
          console.error('Failed to check pending invitations:', error);
        }
      }
    };

    checkPendingInvitations();
  }, [invitationEmail]);

  // Handle post-registration logic
  useEffect(() => {
    const handlePostRegistration = async () => {
      if (isAuthenticated && user && !registrationSuccess && !processingInvitations) {
        setProcessingInvitations(true);
        
        let successMessage = 'Registration successful!';
        
        try {
          if (invitationToken) {
            try {
              await authAPI.acceptInvitation(invitationToken);
              successMessage = 'Welcome! Your account has been created and invitation accepted.';
            } catch (error: any) {
              console.error('Failed to accept specific invitation:', error);
              successMessage = 'Registration successful! Check your notifications for pending invitations.';
            }
          } else if (pendingInvitations.length > 0) {
            successMessage = `Welcome! You have ${pendingInvitations.length} pending team invitation(s) waiting in your notifications.`;
          }

          setSnackbar({
            open: true,
            message: successMessage,
            severity: 'success'
          });

          setRegistrationSuccess(true);

          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          
        } catch (error) {
          console.error('Error in post-registration processing:', error);
          setRegistrationSuccess(true);
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } finally {
          setProcessingInvitations(false);
        }
      }
    };

    handlePostRegistration();
  }, [isAuthenticated, user, invitationToken, pendingInvitations, navigate, registrationSuccess, processingInvitations]);

  const validateField = (name: string, value: string) => {
    const errors: { [key: string]: string } = {};
    
    switch (name) {
      case 'email':
        if (!value) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errors.email = 'Email is invalid';
        }
        break;
      case 'username':
        if (!value) {
          errors.username = 'Username is required';
        } else if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        }
        break;
      case 'first_name':
        if (!value) errors.first_name = 'First name is required';
        break;
      case 'last_name':
        if (!value) errors.last_name = 'Last name is required';
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        }
        break;
      case 'password_confirm':
        if (!value) {
          errors.password_confirm = 'Please confirm your password';
        } else if (value !== formData.password) {
          errors.password_confirm = 'Passwords do not match';
        }
        break;
    }
    
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (localErrors[name]) {
      setLocalErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    if (error) {
      dispatch(clearError());
    }

    if (touched[name]) {
      const errors = validateField(name, value);
      setLocalErrors(prev => ({
        ...prev,
        ...errors,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));

    const errors = validateField(name, value);
    setLocalErrors(prev => ({
      ...prev,
      ...errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = Object.keys(formData).reduce((acc, key) => {
      const fieldErrors = validateField(key, formData[key as keyof typeof formData]);
      return { ...acc, ...fieldErrors };
    }, {});

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      // Mark all fields as touched
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }

    dispatch(register(formData));
  };

  const getErrorMessage = () => {
    if (error) {
      if (error.includes('already exists') || error.includes('taken')) {
        return 'An account with this email or username already exists.';
      }
      if (error.includes('400')) {
        return 'Please check all fields and try again.';
      }
      if (error.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      return error;
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  // Show loading state after successful registration
  if ((isAuthenticated && registrationSuccess) || processingInvitations) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Container component="main" maxWidth="sm">
          <Zoom in={true}>
            <Paper
              elevation={24}
              sx={{
                borderRadius: 4,
                padding: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
              }}
            >
              <CircularProgress size={60} sx={{ mb: 3, color: 'primary.main' }} />
              <Typography variant="h5" gutterBottom fontWeight="600">
                {processingInvitations ? 'Processing your invitations...' : 'Registration Successful!'}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Redirecting to your dashboard...
              </Typography>
            </Paper>
          </Zoom>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 70% 30%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
        },
      }}
    >
      <Container component="main" maxWidth="md">
        <Zoom in={true} timeout={800}>
          <Paper
            elevation={24}
            sx={{
              borderRadius: 4,
              padding: { xs: 3, md: 4 },
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
              },
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Fade in={true} timeout={1000}>
                <Box>
                  <RocketIcon
                    sx={{
                      fontSize: 48,
                      mb: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  />
                  <Typography
                    component="h1"
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 1,
                    }}
                  >
                    Join Shout Sync
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ fontWeight: 400 }}
                  >
                    Create your account and start collaborating
                  </Typography>
                </Box>
              </Fade>
            </Box>

            {/* Invitation Information */}
            {invitationEmail && (
              <Fade in={true}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                  }}
                  icon={<TeamsIcon />}
                >
                  <Typography variant="body2" fontWeight="600">
                    You're joining with an invitation!
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Email: <strong>{invitationEmail}</strong>
                  </Typography>
                </Alert>
              </Fade>
            )}

            {pendingInvitations.length > 0 && (
              <Fade in={true}>
                <Card 
                  sx={{ 
                    mb: 3, 
                    bgcolor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.100',
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TeamsIcon color="primary" />
                      <Typography variant="h6" color="primary.main">
                        Pending Invitations
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {pendingInvitations.slice(0, 3).map((invitation: any, index: number) => (
                        <Chip
                          key={index}
                          label={invitation.team_name}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                      {pendingInvitations.length > 3 && (
                        <Chip
                          label={`+${pendingInvitations.length - 3} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <Fade in={true}>
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'error.light',
                  }}
                >
                  {errorMessage}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                {/* Email */}
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && !!localErrors.email}
                    helperText={touched.email && localErrors.email}
                    disabled={!!invitationEmail}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color={touched.email && localErrors.email ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                      },
                    }}
                  />
                </Grid>

                {/* Username */}
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && !!localErrors.username}
                    helperText={touched.username && localErrors.username}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color={touched.username && localErrors.username ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                      },
                    }}
                  />
                </Grid>

                {/* First and Last Name */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="first_name"
                    label="First Name"
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.first_name && !!localErrors.first_name}
                    helperText={touched.first_name && localErrors.first_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="last_name"
                    label="Last Name"
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.last_name && !!localErrors.last_name}
                    helperText={touched.last_name && localErrors.last_name}
                  />
                </Grid>

              {/* Password Field - FIXED */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}  // Use showPassword state
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && !!localErrors.password}
                  helperText={touched.password && localErrors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color={touched.password && localErrors.password ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"  // Correct label
                          onClick={() => setShowPassword(!showPassword)}  // Correct state
                          edge="end"
                        >
                          {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />} 
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      },
                    },
                  }}
                />
              </Grid>

              {/* Confirm Password Field - FIXED */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password_confirm"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}  // Use showConfirmPassword state
                  id="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password_confirm && !!localErrors.password_confirm}
                  helperText={touched.password_confirm && localErrors.password_confirm}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color={touched.password_confirm && localErrors.password_confirm ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"  // Correct label
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}  // Correct state
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityIcon /> : <VisibilityOffIcon />} 
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      },
                    },
                  }}
                />
              </Grid>
              </Grid>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                size="large"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px 0 rgba(102, 126, 234, 0.5)',
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                  '&:disabled': {
                    background: 'grey.300',
                    transform: 'none',
                    boxShadow: 'none',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'Create Account'
                )}
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?
                </Typography>
              </Divider>

              {/* Sign In Link */}
              <Box textAlign="center">
                <Button
                  component={Link}
                  to="/login"
                  variant="outlined"
                  fullWidth
                  size="large"
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Sign In to Existing Account
                </Button>
              </Box>
            </Box>
          </Paper>
        </Zoom>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegisterForm;