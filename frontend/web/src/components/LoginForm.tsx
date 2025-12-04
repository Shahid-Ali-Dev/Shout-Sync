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
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import { login, clearError } from '../shared/store/slices/authSlice';
import { RootState, AppDispatch } from '../shared/store/store';

// Define proper types for the error object
interface LoginCredentials {
  email_or_username: string;
  password: string;
}

interface ValidationErrors {
  email_or_username?: string;
  password?: string;
}

interface DjangoErrorObject {
  email_or_username?: string | string[];
  email?: string | string[];  
  username?: string | string[]; 
  password?: string | string[];
  detail?: string;
  non_field_errors?: string | string[];
  message?: string;  
  error?: string;    
  [key: string]: any; // For other potential error fields
}
type ErrorType = string | DjangoErrorObject | null;

const LoginForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState<LoginCredentials>({
    email_or_username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({ email_or_username: false, password: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateField = (name: keyof LoginCredentials, value: string): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    if (name === 'email_or_username') {
      if (!value.trim()) {
        errors.email_or_username = 'Email or username is required';
      } else if (value.includes('@')) {
        // Only validate email format if it contains @
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(value)) {
          errors.email_or_username = 'Please enter a valid email address';
        }
      }
      // Username validation (if you want additional constraints)
      else if (value.length < 3) {
        errors.email_or_username = 'Username must be at least 3 characters';
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
      [name as keyof LoginCredentials]: value,
    }));

    // Clear local error when user starts typing
    if (localErrors[name as keyof ValidationErrors]) {
      setLocalErrors(prev => ({
        ...prev,
        [name as keyof ValidationErrors]: undefined,
      }));
    }

    // Clear Redux error
    if (error) {
      dispatch(clearError());
    }

    // Validate field in real-time if touched
    if (touched[name as keyof typeof touched]) {
      const errors = validateField(name as keyof LoginCredentials, value);
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

    const errors = validateField(name as keyof LoginCredentials, value);
    setLocalErrors(prev => ({
      ...prev,
      ...errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validate all fields
    const errors = {
      ...validateField('email_or_username', formData.email_or_username),
      ...validateField('password', formData.password),
    };

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      setTouched({ email_or_username: true, password: true });
      return;
    }

    // Dispatch login with the correct field names
    dispatch(login({
      email_or_username: formData.email_or_username,
      password: formData.password
    } as LoginCredentials));
  };

  const getErrorMessage = (): string | null => {
    if (!error) return null;
    
    // First, check if error is already a string
    if (typeof error === 'string') {
      return error;
    }
    
    // Handle object errors (e.g., from Django serializer)
    if (typeof error === 'object' && error !== null) {
      const djangoError = error as DjangoErrorObject;
      
      // Check for nested error messages
      if (djangoError.email_or_username) {
        if (Array.isArray(djangoError.email_or_username)) {
          return djangoError.email_or_username[0];
        }
        return djangoError.email_or_username as string;
      }
      
      if (djangoError.password) {
        if (Array.isArray(djangoError.password)) {
          return djangoError.password[0];
        }
        return djangoError.password as string;
      }
      
      if (djangoError.detail) {
        if (typeof djangoError.detail === 'string') {
          return djangoError.detail;
        }
        return 'An error occurred';
      }
      
      if (djangoError.non_field_errors) {
        if (Array.isArray(djangoError.non_field_errors)) {
          return djangoError.non_field_errors[0];
        }
        return djangoError.non_field_errors as string;
      }
      
      // Handle specific Django validation errors
      if (djangoError.email) {
        if (Array.isArray(djangoError.email)) {
          return djangoError.email[0];
        }
        return djangoError.email as string;
      }
      
      if (djangoError.username) {
        if (Array.isArray(djangoError.username)) {
          return djangoError.username[0];
        }
        return djangoError.username as string;
      }
      
      // If it's an object with a message property
      if (djangoError.message) {
        return djangoError.message as string;
      }
      
      // If it's an object with an error property
      if (djangoError.error) {
        return djangoError.error as string;
      }
      
      // Try to stringify the object to see what's in it
      try {
        return JSON.stringify(djangoError);
      } catch {
        return 'An error occurred';
      }
    }
    
    return 'An unexpected error occurred. Please try again.';
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
                background: 'none',
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
                    '& .MuiAlert-message': {
                      width: '100%',
                    },
                  }}
                >
                  {errorMessage}
                </Alert>
              </Fade>
            )}

            {/* Form validation errors summary */}
            {submitAttempted && (localErrors.email_or_username || localErrors.password) && !errorMessage && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                }}
              >
                Please fix the errors below to continue.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              {/* Email/Username Field */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email_or_username"
                label="Email or Username"
                name="email_or_username"
                autoComplete="username"
                value={formData.email_or_username}
                onChange={handleChange}
                onBlur={handleBlur}
                error={(touched.email_or_username || submitAttempted) && !!localErrors.email_or_username}
                helperText={(touched.email_or_username || submitAttempted) && localErrors.email_or_username}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon 
                        color={(touched.email_or_username || submitAttempted) && localErrors.email_or_username ? 'error' : 'action'} 
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)',
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
                error={(touched.password || submitAttempted) && !!localErrors.password}
                helperText={(touched.password || submitAttempted) && localErrors.password}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon 
                        color={(touched.password || submitAttempted) && localErrors.password ? 'error' : 'action'} 
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
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
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)',
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
                  position: 'relative',
                }}
              >
                {loading ? (
                  <CircularProgress 
                    size={24} 
                    sx={{ 
                      color: 'white',
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }} 
                  />
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
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-1px)',
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Forgot your password?
                  </Link>
                </Typography>
              </Box>

              {/* Demo credentials hint */}
              <Box textAlign="center" sx={{ mt: 3, pt: 2, borderTop: '1px dashed #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary">
                  💡 Tip: You can use either your email or username to login
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