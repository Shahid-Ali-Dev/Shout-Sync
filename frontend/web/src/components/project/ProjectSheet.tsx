import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewColumn as ViewColumnIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Schema as SchemaIcon,
  Functions as FunctionsIcon,
  Today as TodayIcon,
  Person as PersonIcon,
  CheckBox as CheckBoxIcon,
  List as ListIcon,
  TextFields as TextFieldsIcon,
  Numbers as NumbersIcon,
} from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSelector } from 'react-redux';
import { RootState } from '../../shared/store/store';
import { sheetAPI } from '../../shared/services/sheetAPI';
import { ProjectSheet, SheetColumn, SheetRow, Cell, ColumnType, SheetType } from '../../shared/types/sheetTypes';

interface ProjectSheetProps {
  teamId: string;
  projectId: string;
  sheet: ProjectSheet;
  onSheetUpdate: () => void;
  onBack: () => void;
}

const ProjectSheetComponent: React.FC<ProjectSheetProps> = ({ 
  teamId, 
  projectId, 
  sheet, 
  onSheetUpdate,
  onBack
}) => {
  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string; value: string } | null>(null);
  const [addColumnDialog, setAddColumnDialog] = useState(false);
  const [newColumn, setNewColumn] = useState({
    name: '',
    key: '',
    column_type: ColumnType.TEXT,
    width: 150,
    options: [] as string[],
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Handle cell value update
  const handleCellUpdate = async (rowId: string, columnKey: string, value: string) => {
    try {
      setLoading(true);
      
      // Find the cell ID
      const row = sheet.rows.find(r => r.id === rowId);
      const cell = row?.cells.find(c => c.column_key === columnKey);
      
      if (cell) {
        await sheetAPI.updateCell(teamId, projectId, sheet.id, cell.id, { value });
      } else {
        // If cell doesn't exist, use bulk update
        await sheetAPI.bulkUpdateCells(teamId, projectId, sheet.id, {
          updates: [{ row_id: rowId, column_key: columnKey, value }]
        });
      }
      
      onSheetUpdate();
      setSnackbar({ open: true, message: 'Cell updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to update cell:', error);
      setSnackbar({ open: true, message: 'Failed to update cell', severity: 'error' });
    } finally {
      setLoading(false);
      setEditingCell(null);
    }
  };

  // Add new column
  const handleAddColumn = async () => {
    if (!newColumn.name.trim() || !newColumn.key.trim()) {
      setSnackbar({ open: true, message: 'Column name and key are required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      await sheetAPI.addColumn(teamId, projectId, sheet.id, newColumn);
      setAddColumnDialog(false);
      setNewColumn({ name: '', key: '', column_type: ColumnType.TEXT, width: 150, options: [] });
      onSheetUpdate();
      setSnackbar({ open: true, message: 'Column added successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to add column:', error);
      setSnackbar({ open: true, message: 'Failed to add column', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add new row
  const handleAddRow = async () => {
    try {
      setLoading(true);
      await sheetAPI.addRow(teamId, projectId, sheet.id);
      onSheetUpdate();
      setSnackbar({ open: true, message: 'Row added successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to add row:', error);
      setSnackbar({ open: true, message: 'Failed to add row', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getColumnIcon = (columnType: ColumnType) => {
    switch (columnType) {
      case ColumnType.TEXT: return <TextFieldsIcon fontSize="small" />;
      case ColumnType.NUMBER: return <NumbersIcon fontSize="small" />;
      case ColumnType.DATE: return <TodayIcon fontSize="small" />;
      case ColumnType.SELECT: return <ListIcon fontSize="small" />;
      case ColumnType.CHECKBOX: return <CheckBoxIcon fontSize="small" />;
      case ColumnType.FORMULA: return <FunctionsIcon fontSize="small" />;
      case ColumnType.USER: return <PersonIcon fontSize="small" />;
      case ColumnType.STATUS: return <CheckBoxIcon fontSize="small" />;
      default: return <TextFieldsIcon fontSize="small" />;
    }
  };

  const renderCellContent = (cell: Cell | undefined, column: SheetColumn) => {
    if (!cell) return '';

    switch (column.column_type) {
      case ColumnType.CHECKBOX:
        return cell.value ? '✓' : '○';
      
      case ColumnType.SELECT:
        return (
          <Chip 
            label={cell.value} 
            size="small" 
            color={cell.value === 'Done' ? 'success' : 'default'}
          />
        );
      
      case ColumnType.USER:
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24 }}>
              {cell.value?.charAt(0)}
            </Avatar>
            <Typography variant="body2">{cell.value}</Typography>
          </Box>
        );
      
      default:
        return cell.value;
    }
  };

return (
    <Box>
      {/* Enhanced Header with Back Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        backgroundColor: 'white',
        borderRadius: 3,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={onBack}
            sx={{ 
              backgroundColor: 'primary.50',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.100',
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="600" gutterBottom>
              {sheet.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {sheet.description || "Collaborative sheet"}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            disabled={loading}
            variant="outlined"
          >
            Add Row
          </Button>
          
          <Button
            startIcon={<ViewColumnIcon />}
            onClick={() => setAddColumnDialog(true)}
            disabled={loading}
            variant="outlined"
          >
            Add Column
          </Button>
          
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Sheet Grid */}
      <Paper 
        sx={{ 
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Box sx={{ minWidth: 'max-content' }}>
          {/* Header Row */}
          <Box 
            sx={{ 
              display: 'flex',
              borderBottom: '2px solid',
              borderColor: 'divider',
              backgroundColor: 'grey.50'
            }}
          >
            <Box
              sx={{
                width: 60,
                minWidth: 60,
                p: 2,
                borderRight: '1px solid',
                borderColor: 'divider',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              #
            </Box>
            
            {sheet.columns.map((column) => (
              <Box
                key={column.id}
                sx={{
                  width: column.width,
                  minWidth: column.width,
                  p: 2,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {getColumnIcon(column.column_type)}
                {column.name}
              </Box>
            ))}
          </Box>

          {/* Data Rows */}
          {sheet.rows.map((row, index) => (
            <Box
              key={row.id}
              sx={{
                display: 'flex',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {/* Row Number */}
              <Box
                sx={{
                  width: 60,
                  minWidth: 60,
                  p: 2,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  fontSize: '0.875rem'
                }}
              >
                {index + 1}
              </Box>

              {/* Cells */}
              {sheet.columns.map((column) => {
                const cell = row.cells.find(c => c.column_key === column.key);
                
                return (
                  <Box
                    key={`${row.id}-${column.key}`}
                    sx={{
                      width: column.width,
                      minWidth: column.width,
                      p: 2,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      minHeight: '53px',
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: 'primary.50'
                      }
                    }}
                    onClick={() => setEditingCell({ 
                      rowId: row.id, 
                      columnKey: column.key, 
                      value: cell?.value || '' 
                    })}
                  >
                    {renderCellContent(cell, column)}
                  </Box>
                );
              })}
            </Box>
          ))}

          {/* Empty State */}
          {sheet.rows.length === 0 && (
            <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="h6" gutterBottom>
                No data yet
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Add your first row to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddRow}
              >
                Add First Row
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Cell Edit Dialog */}
      <Dialog
        open={!!editingCell}
        onClose={() => setEditingCell(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Cell
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            value={editingCell?.value || ''}
            onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCell(null)}>Cancel</Button>
          <Button 
            onClick={() => editingCell && handleCellUpdate(editingCell.rowId, editingCell.columnKey, editingCell.value)}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog
        open={addColumnDialog}
        onClose={() => setAddColumnDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add New Column
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Column Name"
              value={newColumn.name}
              onChange={(e) => setNewColumn(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Column Key"
              value={newColumn.key}
              onChange={(e) => setNewColumn(prev => ({ ...prev, key: e.target.value }))}
              placeholder="unique_key_name"
              helperText="Unique identifier for this column (no spaces)"
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Column Type</InputLabel>
              <Select
                value={newColumn.column_type}
                label="Column Type"
                onChange={(e) => setNewColumn(prev => ({ ...prev, column_type: e.target.value as ColumnType }))}
              >
                <MenuItem value={ColumnType.TEXT}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextFieldsIcon fontSize="small" />
                    Text
                  </Box>
                </MenuItem>
                <MenuItem value={ColumnType.NUMBER}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NumbersIcon fontSize="small" />
                    Number
                  </Box>
                </MenuItem>
                <MenuItem value={ColumnType.DATE}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TodayIcon fontSize="small" />
                    Date
                  </Box>
                </MenuItem>
                <MenuItem value={ColumnType.SELECT}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListIcon fontSize="small" />
                    Dropdown
                  </Box>
                </MenuItem>
                <MenuItem value={ColumnType.CHECKBOX}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckBoxIcon fontSize="small" />
                    Checkbox
                  </Box>
                </MenuItem>
                <MenuItem value={ColumnType.USER}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    User
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Width"
              type="number"
              value={newColumn.width}
              onChange={(e) => setNewColumn(prev => ({ ...prev, width: parseInt(e.target.value) || 150 }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddColumnDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddColumn}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Add Column'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ProjectSheetComponent;