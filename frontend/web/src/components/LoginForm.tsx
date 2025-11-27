import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Fade,
  Zoom,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import { login, clearError } from '../shared/store/slices/authSlice';
import { RootState, AppDispatch } from '../shared/store/store';

const LoginForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateField = (name: string, value: string) => {
    const errors: { email?: string; password?: string } = {};
    
    if (name === 'email') {
      if (!value) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        errors.email = 'Email is invalid';
      }
    }
    
    if (name === 'password') {
      if (!value) {
        errors.password = 'Password is required';
      } else if (value.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear local error when user starts typing
    if (localErrors[name as keyof typeof localErrors]) {
      setLocalErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }

    // Clear Redux error
    if (error) {
      dispatch(clearError());
    }

    // Validate field in real-time if touched
    if (touched[name as keyof typeof touched]) {
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
    const errors = {
      ...validateField('email', formData.email),
      ...validateField('password', formData.password),
    };

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      setTouched({ email: true, password: true });
      return;
    }

    dispatch(login(formData));
  };

  const getErrorMessage = () => {
    if (error) {
      if (error.includes('Invalid credentials') || error.includes('Unable to log in')) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      if (error.includes('400')) {
        return 'Please check your email and password format.';
      }
      if (error.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      return error;
    }
    return null;
  };

  const errorMessage = getErrorMessage();

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
          background: 'radial-gradient(circle at 30% 70%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
        },
      }}
    >
      <Container component="main" maxWidth="sm">
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
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
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
                        iconColor: 'primary.main',
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
                    Welcome Back
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ fontWeight: 400 }}
                  >
                    Sign in to your Shout Sync account
                  </Typography>
                </Box>
              </Fade>
            </Box>

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
              {/* Email Field */}
              <TextField
                margin="normal"
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

              {/* Password Field */}
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
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
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
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
                  'Sign In'
                )}
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  New to Shout Sync?
                </Typography>
              </Divider>

              {/* Sign Up Link */}
              <Box textAlign="center">
                <Button
                  component={Link}
                  to="/register"
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
                  Create New Account
                </Button>
              </Box>

              {/* Forgot Password */}
              <Box textAlign="center" sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <Link
                    to="/forgot-password"
                    style={{
                      textDecoration: 'none',
                      color: '#667eea',
                      fontWeight: 500,
                    }}
                  >
                    Forgot your password?
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default LoginForm;