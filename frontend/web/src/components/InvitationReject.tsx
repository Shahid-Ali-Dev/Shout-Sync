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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  GroupRemove as GroupRemoveIcon,
} from '@mui/icons-material';
import { authAPI } from '../shared/services/api';

const InvitationReject: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    team_name?: string; // Changed from organization_name
    invited_by_name?: string;
  } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    const loadInvitationDetails = async () => {
      if (!token) {
        setResult({ success: false, message: 'Invalid invitation link' });
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getInvitationDetails(token);
        setResult({
          success: true,
          message: 'Invitation loaded successfully',
          team_name: response.data.team_name, // Changed from organization_name
          invited_by_name: response.data.invited_by_name,
        });
      } catch (error: any) {
        setResult({
          success: false,
          message: error.response?.data?.error || 'Failed to load invitation details',
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvitationDetails();
  }, [token]);

  const handleRejectInvitation = async () => {
    if (!token) return;

    try {
      setProcessing(true);
      await authAPI.rejectInvitationPublic(token);
      setResult({
        success: true,
        message: 'Invitation declined successfully',
        team_name: result?.team_name, // Changed from organization_name
        invited_by_name: result?.invited_by_name,
      });
      setConfirmDialogOpen(false);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Failed to decline invitation',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
  };

  const handleOpenConfirmDialog = () => {
    setConfirmDialogOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading invitation details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!result) {
    return null;
  }

  // If invitation is already processed or invalid
  if (!result.success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
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
          </Box>
        </Paper>
      </Container>
    );
  }

  // If invitation was successfully rejected
  if (result.success && result.message.includes('declined')) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Invitation Declined
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
              <Typography variant="body1">
                You have declined the invitation to join{' '}
                <strong>{result.team_name}</strong>. {/* Updated text */}
              </Typography>
            </Alert>

            <Card sx={{ mb: 3, width: '100%', bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">
                  <strong>What happens next?</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  • The inviter will be notified that you declined
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • You won't receive further reminders about this invitation
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • You can still join this team later if invited again {/* Updated text */}
                </Typography>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Go Home
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Show invitation details with reject option
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          <GroupRemoveIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Decline Invitation?
          </Typography>

          <Alert severity="warning" sx={{ mb: 3, width: '100%' }}>
            <Typography variant="body1">
              You've been invited by <strong>{result.invited_by_name}</strong> to join{' '}
              <strong>{result.team_name}</strong>. {/* Updated text */}
            </Typography>
          </Alert>

          <Card sx={{ mb: 3, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="textSecondary">
                Before you decline...
              </Typography>
              
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" color="textSecondary" paragraph>
                  <strong>What you'll miss:</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                  • Collaborating with the team on projects and tasks
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                  • Real-time communication and file sharing
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                  • AI-powered productivity features
                </Typography>
                
                <Typography variant="body2" color="textSecondary" paragraph sx={{ mt: 2 }}>
                  <strong>Note:</strong> You can still join later if you change your mind and get invited again.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              size="large"
            >
              Maybe Later
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleOpenConfirmDialog}
              size="large"
            >
              Decline Invitation
            </Button>
          </Box>

          <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
            Changed your mind?{' '}
            <Link to={`/invitation/accept/${token}`}>
              Accept the invitation instead
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CancelIcon color="error" />
            Confirm Decline
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to decline the invitation to join{' '}
            <strong>{result.team_name}</strong>? {/* Updated text */}
          </Typography>
          <Alert severity="warning">
            This action cannot be undone. You'll need to be invited again to join this team. {/* Updated text */}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseConfirmDialog}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRejectInvitation}
            color="error"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            {processing ? 'Declining...' : 'Yes, Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvitationReject;