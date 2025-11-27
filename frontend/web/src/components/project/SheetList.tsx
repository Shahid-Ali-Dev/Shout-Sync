import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  TableChart as TableIcon,
  ViewKanban as KanbanIcon,
  GridOn as GridIcon,
  DynamicForm as FormIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { ProjectSheet, SheetType } from '../../shared/types/sheetTypes';
import { sheetAPI } from '../../shared/services/sheetAPI';

interface SheetListProps {
  teamId: string;
  projectId: string;
  sheets: ProjectSheet[];
  onSheetsUpdate: () => void;
  onSheetSelect: (sheet: ProjectSheet) => void;
}

const SheetList: React.FC<SheetListProps> = ({ teamId, projectId, sheets, onSheetsUpdate, onSheetSelect }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sheetMenuAnchor, setSheetMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSheet, setSelectedSheet] = useState<ProjectSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [newSheet, setNewSheet] = useState({
    name: '',
    description: '',
    sheet_type: SheetType.SPREADSHEET,
    is_public: false,
  });

  const handleCreateSheet = async () => {
    if (!newSheet.name.trim()) {
      setSnackbar({ open: true, message: 'Sheet name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      await sheetAPI.createSheet(teamId, projectId, newSheet);
      setCreateDialogOpen(false);
      setNewSheet({ name: '', description: '', sheet_type: SheetType.SPREADSHEET, is_public: false });
      onSheetsUpdate();
      setSnackbar({ open: true, message: 'Sheet created successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to create sheet:', error);
      setSnackbar({ open: true, message: 'Failed to create sheet', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getSheetIcon = (sheetType: SheetType) => {
    switch (sheetType) {
      case SheetType.SPREADSHEET: return <GridIcon sx={{ fontSize: 40 }} />;
      case SheetType.KANBAN: return <KanbanIcon sx={{ fontSize: 40 }} />;
      case SheetType.TABLE: return <TableIcon sx={{ fontSize: 40 }} />;
      case SheetType.FORM: return <FormIcon sx={{ fontSize: 40 }} />;
      default: return <TableIcon sx={{ fontSize: 40 }} />;
    }
  };

  const getSheetTypeLabel = (sheetType: SheetType) => {
    switch (sheetType) {
      case SheetType.SPREADSHEET: return 'Spreadsheet';
      case SheetType.KANBAN: return 'Kanban Board';
      case SheetType.TABLE: return 'Data Table';
      case SheetType.FORM: return 'Form';
      default: return 'Sheet';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="600" gutterBottom>
            Project Sheets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage collaborative sheets for your project
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: '600'
          }}
        >
          New Sheet
        </Button>
      </Box>

      {/* Sheets Grid */}
      <Grid container spacing={3}>
        {sheets.map((sheet) => (
          <Grid item xs={12} sm={6} md={4} key={sheet.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                }
              }}
              onClick={() => onSheetSelect(sheet)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    backgroundColor: 'primary.50',
                    color: 'primary.main'
                  }}>
                    {getSheetIcon(sheet.sheet_type)}
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheetMenuAnchor(e.currentTarget);
                      setSelectedSheet(sheet);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>

                <Typography variant="h6" fontWeight="600" gutterBottom>
                  {sheet.name}
                </Typography>
                
                {sheet.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {sheet.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={getSheetTypeLabel(sheet.sheet_type)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  
                  <Typography variant="caption" color="text.secondary">
                    {sheet.row_count} rows
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Empty State */}
        {sheets.length === 0 && (
          <Grid item xs={12}>
            <Card 
              sx={{ 
                textAlign: 'center', 
                p: 6,
                backgroundColor: 'grey.50'
              }}
            >
              <TableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Sheets Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first sheet to start organizing data
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create First Sheet
              </Button>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Create Sheet Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: '700',
          py: 3
        }}>
          Create New Sheet
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="Sheet Name"
              required
              fullWidth
              value={newSheet.name}
              onChange={(e) => setNewSheet({ ...newSheet, name: e.target.value })}
              placeholder="Enter sheet name"
            />
            
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={newSheet.description}
              onChange={(e) => setNewSheet({ ...newSheet, description: e.target.value })}
              placeholder="Describe what this sheet will be used for"
            />
            
            <FormControl fullWidth>
              <InputLabel>Sheet Type</InputLabel>
              <Select
                value={newSheet.sheet_type}
                label="Sheet Type"
                onChange={(e) => setNewSheet({ ...newSheet, sheet_type: e.target.value as SheetType })}
              >
                <MenuItem value={SheetType.SPREADSHEET}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GridIcon fontSize="small" />
                    Spreadsheet
                  </Box>
                </MenuItem>
                <MenuItem value={SheetType.KANBAN}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KanbanIcon fontSize="small" />
                    Kanban Board
                  </Box>
                </MenuItem>
                <MenuItem value={SheetType.TABLE}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableIcon fontSize="small" />
                    Data Table
                  </Box>
                </MenuItem>
                <MenuItem value={SheetType.FORM}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormIcon fontSize="small" />
                    Form
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, gap: 2 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            sx={{ borderRadius: 2, px: 4 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSheet} 
            variant="contained"
            disabled={!newSheet.name || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ borderRadius: 2, px: 4 }}
          >
            {loading ? 'Creating...' : 'Create Sheet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sheet Menu */}
      <Menu
        anchorEl={sheetMenuAnchor}
        open={Boolean(sheetMenuAnchor)}
        onClose={() => setSheetMenuAnchor(null)}
      >
        <MenuItem onClick={() => setSheetMenuAnchor(null)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => setSheetMenuAnchor(null)}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem 
          onClick={() => setSheetMenuAnchor(null)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SheetList;