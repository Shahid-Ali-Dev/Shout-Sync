import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

interface CreateTeamFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  loading?: boolean;
}

const CreateTeamForm: React.FC<CreateTeamFormProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', description: '' }); // Reset form
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Team</DialogTitle> {/* Updated title */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              name="name"
              label="Team Name" 
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              name="description"
              label="Description"
              type="text"
              multiline
              rows={3}
              fullWidth
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !formData.name}>
            {loading ? 'Creating...' : 'Create Team'} {/* Updated button text */}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateTeamForm;