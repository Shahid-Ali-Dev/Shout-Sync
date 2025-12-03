// JoinTeamDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  GroupAdd as GroupAddIcon,
  Link as LinkIcon,
  Check as CheckIcon,
  Send as SendIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';

interface JoinTeamDialogProps {
  open: boolean;
  onClose: () => void;
}

const JoinTeamDialog: React.FC<JoinTeamDialogProps> = ({
  open,
  onClose,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeStep, setActiveStep] = useState(0);
  const [teamLink, setTeamLink] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{ name: string; id: string } | null>(null);

  // Extract team ID from various URL formats
  const extractTeamIdFromLink = (link: string): string | null => {
    // Handle different URL formats:
    // 1. Full URL: http://localhost:3000/team/123e4567-e89b-12d3-a456-426614174000
    // 2. Just the team ID: 123e4567-e89b-12d3-a456-426614174000
    // 3. Path: /team/123e4567-e89b-12d3-a456-426614174000
    
    const trimmedLink = link.trim();
    
    // If it's just a UUID, return it directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmedLink)) {
      return trimmedLink;
    }
    
    // Try to extract from URL
    try {
      // If it's a path like /team/123e4567-e89b-12d3-a456-426614174000
      const pathMatch = trimmedLink.match(/\/team\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
      
      // If it's a full URL
      const url = new URL(trimmedLink.startsWith('http') ? trimmedLink : `https://${trimmedLink}`);
      const pathParts = url.pathname.split('/');
      const teamIdIndex = pathParts.indexOf('team') + 1;
      
      if (teamIdIndex > 0 && teamIdIndex < pathParts.length) {
        const potentialTeamId = pathParts[teamIdIndex];
        if (uuidRegex.test(potentialTeamId)) {
          return potentialTeamId;
        }
      }
    } catch (err) {
      // If URL parsing fails, try direct extraction
      const directMatch = trimmedLink.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (directMatch && directMatch[1]) {
        return directMatch[1];
      }
    }
    
    return null;
  };

  const validateTeamLink = async () => {
    if (!teamLink.trim()) {
      setError('Please enter a team link or team ID');
      return;
    }

    const teamId = extractTeamIdFromLink(teamLink);
    if (!teamId) {
      setError('Invalid team link format. Please enter a valid team URL or team ID.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First, verify the team exists and get its info
      const teamResponse = await teamAPI.getTeam(teamId);
      setTeamInfo({
        name: teamResponse.data.name,
        id: teamId
      });
      
      setActiveStep(1);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Team not found. Please check the link and try again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this team.');
      } else {
        setError('Failed to verify team. Please check the link and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!teamInfo || !user?.email) return;

    try {
      setLoading(true);
      setError(null);
      
      // Use the current user's email from Redux store
      await teamAPI.requestToJoinTeam(teamInfo.id, {
        email: user.email, // This is the key fix - use logged-in user's email
        message: message.trim() || 'I would like to join your team.'
      });
      
      setSuccess(true);
      setActiveStep(2);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to send join request';
      
      if (errorMessage.includes('already a member')) {
        setError('You are already a member of this team.');
      } else if (errorMessage.includes('pending request')) {
        setError('You already have a pending request to join this team.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setTimeout(() => {
      setActiveStep(0);
      setTeamLink('');
      setMessage('');
      setError(null);
      setSuccess(false);
      setTeamInfo(null);
      setLoading(false);
    }, 300);
  };

  const steps = [
    {
      label: 'Enter Team Link',
      description: 'Paste the team link or team ID you received',
    },
    {
      label: 'Send Request',
      description: 'Add a message and send your join request',
    },
    {
      label: 'Request Sent',
      description: 'Your request has been sent to the team admins',
    },
  ];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: 'primary.main',
        color: 'white',
        fontWeight: '600',
        py: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GroupAddIcon />
          Join a Team
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Stepper */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {/* Step 0: Enter Team Link */}
                  {index === 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Paste the team link you received from the team admin or owner:
                      </Typography>
                      
                      <TextField
                        fullWidth
                        value={teamLink}
                        onChange={(e) => setTeamLink(e.target.value)}
                        placeholder="https://yourapp.com/team/team-id or team-id"
                        disabled={loading}
                        sx={{ 
                          mb: 2,
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: 2,
                          } 
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && teamLink.trim()) {
                            validateTeamLink();
                          }
                        }}
                      />

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip 
                          icon={<LinkIcon />} 
                          label="Team Link" 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          icon={<ContentCopyIcon />} 
                          label="Team ID" 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>

                      {error && (
                        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
                          {error}
                        </Alert>
                      )}

                      <Button
                        variant="contained"
                        onClick={validateTeamLink}
                        disabled={!teamLink.trim() || loading}
                        startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: '600'
                        }}
                      >
                        {loading ? 'Verifying...' : 'Verify Team'}
                      </Button>
                    </Box>
                  )}

                  {/* Step 1: Send Request */}
                  {index === 1 && teamInfo && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Team Found: <strong>{teamInfo.name}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Your request will be sent to the team admins for approval.
                        </Typography>
                      </Alert>

                      {/* Show current user's email that will be used */}
                      <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Request will be sent from: <strong>{user?.email}</strong>
                        </Typography>
                      </Box>

                      <TextField
                        label="Message to Team Admins (Optional)"
                        multiline
                        rows={3}
                        fullWidth
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell the team admins why you want to join..."
                        disabled={loading}
                        sx={{ 
                          mb: 2,
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: 2,
                          } 
                        }}
                      />

                      {error && (
                        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
                          {error}
                        </Alert>
                      )}

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setActiveStep(0)}
                          disabled={loading}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none'
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSendRequest}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: '600'
                          }}
                        >
                          {loading ? 'Sending...' : 'Send Join Request'}
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* Step 2: Success */}
                  {index === 2 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom color="success.main">
                        Request Sent Successfully!
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Your request to join <strong>{teamInfo?.name}</strong> has been sent to the team admins. 
                        You'll be notified when they respond to your request.
                      </Typography>
                      
                      <Button
                        variant="contained"
                        onClick={handleClose}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: '600'
                        }}
                      >
                        Close
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Help Text */}
        {activeStep === 0 && (
          <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>How to get a team link:</strong> Ask a team admin or owner to share the team's URL with you. 
              It should look like: <code>https://yourapp.com/team/team-id</code>
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Only show close button in first two steps */}
      {(activeStep === 0 || activeStep === 1) && (
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default JoinTeamDialog;