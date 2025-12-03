// src/components/dialogs/CreateTeamDialog.tsx - SIMPLIFIED VERSION
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Groups as TeamsIcon,
  Close as CloseIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import { teamAPI } from '../../shared/services/teamAPI';

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated?: (team: any) => void;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onClose,
  onTeamCreated
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [teamData, setTeamData] = useState({
    name: '',
    description: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setTeamData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateTeam = async () => {
    if (!teamData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (teamData.name.trim().length < 3) {
      setError('Team name must be at least 3 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the team with basic info
      const teamResponse = await teamAPI.createTeam({
        name: teamData.name.trim(),
        description: teamData.description.trim(),
      });

      // Callback for success
      if (onTeamCreated) {
        onTeamCreated(teamResponse.data);
      }

      // Reset and close
      handleClose();
      
    } catch (error: any) {
      console.error('Failed to create team:', error);
      setError(error.response?.data?.error || 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setTeamData({
      name: '',
      description: '',
    });
    setError(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && teamData.name.trim()) {
      handleCreateTeam();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 4,
          overflow: 'hidden'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        backgroundColor: 'primary.main',
        color: 'white',
        fontWeight: '700',
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RocketIcon />
          Create New Team
        </Box>
        <Button
          onClick={handleClose}
          sx={{ 
            color: 'white',
            minWidth: 'auto',
            p: 0.5
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mx: 3, 
            mt: 2,
            borderRadius: 2
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <TextField
            label="Team Name"
            required
            fullWidth
            value={teamData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your team name"
            helperText="Choose a descriptive name for your team (min. 3 characters)"
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2,
              } 
            }}
            autoFocus
          />
          <TextField
            label="Description"
            multiline
            rows={3}
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
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ 
            borderRadius: 2,
            px: 4,
            textTransform: 'none',
            fontWeight: '500'
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateTeam} 
          variant="contained"
          disabled={!teamData.name.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <TeamsIcon />}
          sx={{ 
            borderRadius: 2,
            px: 4,
            textTransform: 'none',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}
        >
          {loading ? 'Creating...' : 'Create Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTeamDialog;