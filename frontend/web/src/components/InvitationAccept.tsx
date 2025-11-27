import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  GroupAdd as GroupIcon,
} from '@mui/icons-material';
import { authAPI } from '../shared/services/api';

const InvitationAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    action_required?: string;
    team_name?: string; // Changed from organization_name
    invited_by_name?: string;
    invitation_email?: string;
  } | null>(null);

  useEffect(() => {
    const processInvitation = async () => {
      if (!token) {
        setResult({ success: false, message: 'Invalid invitation link' });
        setLoading(false);
        return;
      }

      try {
        setProcessing(true);
        const response = await authAPI.acceptInvitationPublic(token);
        
        if (response.data.action_required === 'register') {
          // User needs to register first
          setResult({
            success: true,
            message: response.data.message,
            action_required: 'register',
            team_name: response.data.team_name, // Changed from organization_name
            invited_by_name: response.data.invited_by_name,
            invitation_email: response.data.invitation_email,
          });
        } else {
          // Successfully joined team
          setResult({
            success: true,
            message: response.data.message,
            team_name: response.data.team_name, // Changed from organization_name
          });
        }
      } catch (error: any) {
        setResult({
          success: false,
          message: error.response?.data?.error || 'Failed to process invitation',
        });
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    };

    processInvitation();
  }, [token]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Processing invitation...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          {result.success ? (
            <>
              <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom color="success.main">
                Invitation Accepted!
              </Typography>
              
              {result.action_required === 'register' ? (
                <>
                  <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
                    <Typography variant="body1" gutterBottom>
                      You've been invited by <strong>{result.invited_by_name}</strong> to join{' '}
                      <strong>{result.team_name}</strong>. {/* Updated text */}
                    </Typography>
                    <Typography>
                      Please create an account to accept this invitation.
                    </Typography>
                  </Alert>
                  
                  <Card sx={{ mb: 3, width: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Create Your Account
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        Your invitation is reserved for: <strong>{result.invitation_email}</strong>
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        component={Link}
                        to={`/register?email=${result.invitation_email}`}
                        fullWidth
                      >
                        Create Account & Join
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Typography variant="body2" color="textSecondary">
                    Already have an account?{' '}
                    <Link to={`/login?email=${result.invitation_email}`}>
                      Sign in here
                    </Link>
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Welcome to {result.team_name}! {/* Updated text */}
                  </Typography>
                  <Typography variant="body1" color="textSecondary" paragraph>
                    {result.message}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    startIcon={<GroupIcon />}
                  >
                    Go to Dashboard
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom color="error.main">
                Invitation Error
              </Typography>
              <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                <Typography>{result.message}</Typography>
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
              >
                Go Home
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default InvitationAccept;