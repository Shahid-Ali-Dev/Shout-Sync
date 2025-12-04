// src/components/ProjectList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
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
  Alert,
  Snackbar,
  CircularProgress,
  ListItemIcon,
  Fab,
  Tooltip,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Badge,
  Tabs,
  Tab,
  Drawer,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Groups as GroupsIcon,
  Assignment as TaskIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  Lightbulb as Lightbulb,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Dashboard as DashboardIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Lightbulb as PlanningIcon,
  TrendingFlat as TrendingFlatIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Clear as ClearIcon,
  GroupWork as GroupWorkIcon,
  FilterList as FilterIcon,
  Tune as TuneIcon,
  ViewCompact as CompactIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/store/store';
import { projectAPI } from '../shared/services/projectAPI';
import { teamAPI } from '../shared/services/teamAPI';
import CommonHeader from '../components/CommonHeader';
import CreateProjectDialog from '../components/dialogs/CreateProjectDialog';
import EditProjectDialog from '../components/dialogs/EditProjectDialog';
import QuickActionsMenu from '../components/QuickActionsMenu';

// --- Types & Config ---

interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: number;
  created_by: string;
  created_by_name: string;
  members: any[];
  member_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
  team?: string;
  team_name?: string;
  progress?: number;
  days_remaining?: number;
  is_favorite?: boolean;
  priority?: number;
}

enum ProjectStatus {
  PLANNING = 1,
  ACTIVE = 2,
  ON_HOLD = 3,
  COMPLETED = 4,
  CANCELLED = 5,
  ARCHIVED = 6
}

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  planning: number;
  onHold: number;
  cancelled: number;
  archived: number;
}

interface ProjectStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
  bgColor: string;
  textColor: string;
  description: string;
  iconColor: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  member_count: number;
}

interface PriorityConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
}

type EnhancedProject = Project & {
  progress?: number;
  daysRemaining?: number;
  team_name?: string;
  team_id?: string;
  member_count: number;
  task_count: number;
  is_favorite?: boolean;
  priority?: number;
};

const PROJECT_STATUS_CONFIG: Record<number, ProjectStatusConfig> = {
  [ProjectStatus.PLANNING]: {
    label: 'Planning',
    color: 'default',
    icon: <PlanningIcon fontSize="small" />,
    bgColor: 'grey.50',
    textColor: 'grey.700',
    description: 'Project is in planning phase',
    iconColor: '#6B7280'
  },
  [ProjectStatus.ACTIVE]: {
    label: 'Active',
    color: 'success',
    icon: <PlayIcon fontSize="small" />,
    bgColor: 'success.50',
    textColor: 'success.700',
    description: 'Project is actively being worked on',
    iconColor: '#10B981'
  },
  [ProjectStatus.ON_HOLD]: {
    label: 'On Hold',
    color: 'warning',
    icon: <PauseIcon fontSize="small" />,
    bgColor: 'warning.50',
    textColor: 'warning.700',
    description: 'Project is temporarily paused',
    iconColor: '#F59E0B'
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    color: 'info',
    icon: <CheckCircleIcon fontSize="small" />,
    bgColor: 'info.50',
    textColor: 'info.700',
    description: 'Project has been completed',
    iconColor: '#3B82F6'
  },
  [ProjectStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    bgColor: 'error.50',
    textColor: 'error.700',
    description: 'Project has been cancelled',
    iconColor: '#EF4444'
  },
  [ProjectStatus.ARCHIVED]: {
    label: 'Archived',
    color: 'default',
    icon: <ArchiveIcon fontSize="small" />,
    bgColor: 'grey.100',
    textColor: 'grey.600',
    description: 'Project has been archived',
    iconColor: '#9CA3AF'
  },
};

const PRIORITY_CONFIG: Record<number, PriorityConfig> = {
  1: { 
    label: 'Low', 
    color: 'success', 
    icon: <TrendingFlatIcon fontSize="small" /> 
  },
  2: { 
    label: 'Medium', 
    color: 'warning', 
    icon: <TrendingUpIcon fontSize="small" /> 
  },
  3: { 
    label: 'High', 
    color: 'error', 
    icon: <BoltIcon fontSize="small" /> 
  },
  4: { 
    label: 'Critical', 
    color: 'error', 
    icon: <BoltIcon fontSize="small" /> 
  },
};


// --- UTILITY FUNCTIONS ---
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getDaysRemaining = (endDate: string) => {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getProgressColor = (days: number) => {
  if (days < 0) return 'error';
  if (days < 7) return 'warning';
  return 'success';
};

// --- ENHANCED COMPONENTS ---

// 1. Enhanced Project Card Component - Optimized for mobile
const ProjectCard = ({ 
  project, 
  onMenuOpen, 
  onToggleFavorite,
  isAllProjectsView,
  compact = false
}: { 
  project: EnhancedProject,
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, p: EnhancedProject) => void,
  onToggleFavorite: (p: EnhancedProject, e: React.MouseEvent) => void,
  isAllProjectsView: boolean,
  compact?: boolean
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        borderRadius: 2,
        backgroundColor: 'white',
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: compact ? 280 : 320,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)',
          borderColor: 'primary.main'
        }
      }}
    >
      <CardContent sx={{ 
        p: compact ? 2 : 2.5, 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        '&:last-child': { pb: compact ? 2 : 2.5 }
      }}>

        {/* Header with Favorite, Status, Priority, and Menu - FIXED ALIGNMENT */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1.5, 
          gap: 0.5,
          minHeight: 32 // Fixed height for consistent alignment
        }}>
          {/* Left side: Favorite + Status */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            flex: 1 
          }}>
            <IconButton
              size="small"
              onClick={(e) => onToggleFavorite(project, e)}
              sx={{ 
                color: project.is_favorite ? 'warning.main' : 'grey.400',
                p: 0.5,
                '&:hover': { backgroundColor: 'warning.50' },
                alignSelf: 'flex-start', // Align to top
                mt: 1.5 // Small top margin to align with chips
              }}
            >
              <StarIcon sx={{ fontSize: compact ? 18 : 20 }} />
            </IconButton>
            
            <Chip
              icon={React.cloneElement(PROJECT_STATUS_CONFIG[project.status]?.icon, {
                sx: { 
                  color: PROJECT_STATUS_CONFIG[project.status]?.iconColor,
                  fontSize: compact ? 14 : 16
                }
              })}
              label={!isMobile ? PROJECT_STATUS_CONFIG[project.status]?.label : PROJECT_STATUS_CONFIG[project.status]?.label.slice(0, 3)}
              color={PROJECT_STATUS_CONFIG[project.status]?.color}
              size="small"
              sx={{ 
                fontWeight: '600', 
                borderRadius: 1,
                height: compact ? 24 : 28,
                fontSize: compact ? '0.7rem' : '0.75rem',
                alignSelf: 'flex-start', // Align to top
                mt: 0.5 // Match favorite button alignment
              }}
            />
          </Box>
          
          {/* Right side: Priority + Menu - Now properly aligned in single row */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            height: '100%' // Take full height
          }}>
            {/* Priority Badge - Show ALL priorities */}
            {project.priority && (
              <Tooltip title={PRIORITY_CONFIG[project.priority].label}>
                <Chip
                  icon={PRIORITY_CONFIG[project.priority].icon}
                  label={!isMobile ? PRIORITY_CONFIG[project.priority].label : ''}
                  color={PRIORITY_CONFIG[project.priority].color as any}
                  size="small"
                  sx={{ 
                    fontWeight: '600', 
                    borderRadius: 1,
                    height: compact ? 24 : 28,
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    minWidth: isMobile ? 32 : 'auto',
                    alignSelf: 'flex-start', // Align to top
                    mt: 0.5 // Match status chip alignment
                  }}
                />
              </Tooltip>
            )}
            
            <IconButton
              size="small"
              onClick={(e) => onMenuOpen(e, project)}
              sx={{ 
                '&:hover': { backgroundColor: 'action.hover' },
                width: compact ? 30 : 36,
                height: compact ? 30 : 36,
                alignSelf: 'flex-start', // Align to top
                mt: 0.5 // Match chips alignment
              }}
            >
              <MoreIcon sx={{ fontSize: compact ? 18 : 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Project Title and Description */}
        <Box 
          onClick={() => navigate(`/team/${project.team_id}/project/${project.id}`)}
          sx={{ cursor: 'pointer', flex: 1 }}
        >
          <Typography 
            variant={compact ? "subtitle1" : "h6"}
            component="h2" 
            sx={{ 
              mb: 1.5,
              fontWeight: '700',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: compact ? '2.4em' : '2.6em',
              fontSize: compact ? '1rem' : '1.125rem'
            }}
          >
            {project.name}
          </Typography>

          {!compact && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.8em'
              }}
            >
              {project.description || 'No description provided'}
            </Typography>
          )}

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="500">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight="600" color="primary.main">
                {project.progress || 0}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={project.progress || 0} 
              sx={{ 
                height: 4,
                borderRadius: 2,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* Timeline */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="500">
                Timeline
              </Typography>
              {project.end_date && (
                <Chip
                  label={`${project.daysRemaining}d`}
                  size="small"
                  color={getProgressColor(project.daysRemaining || 0) as any}
                  variant="outlined"
                  sx={{ 
                    fontWeight: '500',
                    height: 20,
                    fontSize: '0.65rem'
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {formatDate(project.start_date)} - {formatDate(project.end_date)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer Stats - Compact version */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          mt: 'auto'
        }}>
          <Tooltip title="Team members">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GroupsIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary" fontWeight="500">
                {project.member_count}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Tasks">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TaskIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary" fontWeight="500">
                {project.task_count}
              </Typography>
            </Box>
          </Tooltip>

          {isAllProjectsView && project.team_name && (
            <Tooltip title={project.team_name}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupWorkIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
                {!isMobile && (
                  <Typography variant="caption" color="text.secondary" fontWeight="500" sx={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.team_name}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// 2. Enhanced Project List Item Component
const ProjectListItem = ({ 
  project, 
  onMenuOpen, 
  onToggleFavorite,
  isAllProjectsView 
}: { 
  project: EnhancedProject,
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, p: EnhancedProject) => void,
  onToggleFavorite: (p: EnhancedProject, e: React.MouseEvent) => void,
  isAllProjectsView: boolean
}) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 600px)');

  return (
    <Paper 
      sx={{ 
        borderRadius: 2,
        backgroundColor: 'white',
        border: '1px solid',
        borderColor: 'divider',
        mb: 1.5,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderColor: 'primary.main'
        }
      }}
    >
      <Box 
        sx={{ 
          p: isMobile ? 2 : 2.5, 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 2 : 3, 
          cursor: 'pointer' 
        }}
        onClick={() => navigate(`/team/${project.team_id}/project/${project.id}`)}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" fontWeight="600" sx={{ flex: 1, minWidth: isMobile ? 120 : 200, fontSize: isMobile ? '1rem' : '1.125rem' }}>
              {project.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                icon={React.cloneElement(PROJECT_STATUS_CONFIG[project.status]?.icon, {
                  sx: { color: PROJECT_STATUS_CONFIG[project.status]?.iconColor }
                })}
                label={PROJECT_STATUS_CONFIG[project.status]?.label}
                color={PROJECT_STATUS_CONFIG[project.status]?.color}
                size="small"
                sx={{ fontWeight: '600' }}
              />
              {project.priority && (
                <Chip
                  icon={PRIORITY_CONFIG[project.priority].icon}
                  label={PRIORITY_CONFIG[project.priority].label}
                  color={PRIORITY_CONFIG[project.priority].color as any}
                  size="small"
                  sx={{ fontWeight: '600' }}
                />
              )}
              {isAllProjectsView && project.team_name && !isMobile && (
                <Chip label={project.team_name} size="small" variant="outlined" sx={{ fontWeight: '500' }} />
              )}
            </Box>
          </Box>
          
          {project.description && !isMobile && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{project.description}</Typography>
          )}

          <Box sx={{ display: 'flex', gap: isMobile ? 2 : 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                {formatDate(project.start_date)} - {formatDate(project.end_date)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GroupsIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                {project.member_count} members
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TaskIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                {project.task_count} tasks
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary" fontWeight="500">
                {project.progress || 0}% complete
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={(e) => onToggleFavorite(project, e)} 
            sx={{ color: project.is_favorite ? 'warning.main' : 'grey.400' }}
          >
            <StarIcon />
          </IconButton>
          <IconButton 
            onClick={(e) => onMenuOpen(e, project)} 
            sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
          >
            <MoreIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

// 3. Filter Drawer Component for Mobile
const FilterDrawer = ({ 
  open, 
  onClose, 
  filters,
  onFilterChange,
  teams,
  isAllProjectsView 
}: {
  open: boolean;
  onClose: () => void;
  filters: any;
  onFilterChange: (key: string, value: any) => void;
  teams: Team[];
  isAllProjectsView: boolean;
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 300,
          p: 3
        }
      }}
    >
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
              <MenuItem key={status} value={parseInt(status)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {React.cloneElement(config.icon, { sx: { color: config.iconColor } })}
                  {config.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isAllProjectsView && teams.length > 1 && (
          <FormControl fullWidth size="small">
            <InputLabel>Team</InputLabel>
            <Select
              value={filters.team}
              label="Team"
              onChange={(e) => onFilterChange('team', e.target.value)}
            >
              <MenuItem value="all">All Teams</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth size="small">
          <InputLabel>Priority</InputLabel>
          <Select
            value={filters.priority}
            label="Priority"
            onChange={(e) => onFilterChange('priority', e.target.value)}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
              <MenuItem key={priority} value={parseInt(priority)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {config.icon}
                  {config.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort By"
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
          >
            <MenuItem value="created_at">Date Created</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="start_date">Start Date</MenuItem>
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="progress">Progress</MenuItem>
            <MenuItem value="priority">Priority</MenuItem>
            {isAllProjectsView && <MenuItem value="team">Team</MenuItem>}
          </Select>
        </FormControl>

        <Button 
          variant="outlined" 
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Apply Filters
        </Button>
      </Box>
    </Drawer>
  );
};

// --- MAIN COMPONENT ---

const ProjectList: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isTablet = useMediaQuery('(max-width: 900px)');
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [projects, setProjects] = useState<EnhancedProject[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<EnhancedProject | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // Enhanced state management
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all' as number | 'all',
    team: 'all' as string,
    priority: 'all' as number | 'all',
    sortBy: 'created_at' as 'name' | 'created_at' | 'start_date' | 'status' | 'progress' | 'team' | 'priority',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const [projectStats, setProjectStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    planning: 0,
    onHold: 0,
    cancelled: 0,
    archived: 0,
  });

  // Determine view context
  const isAllProjectsView = !teamId || location.pathname.includes('/projects');
  const currentTeam = teams.find(team => team.id === teamId);

  // Auto-adjust view mode based on screen size
  useEffect(() => {
    if (isSmallMobile) {
      setViewMode('compact');
    } else if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile, isSmallMobile]);

  const calculatePriority = (project: Project): number => {
    if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED) return 1;
    const daysRemaining = getDaysRemaining(project.end_date);
    if (daysRemaining < 0) return 4;
    if (daysRemaining < 3) return 4;
    if (daysRemaining < 7) return 3;
    if (daysRemaining < 14) return 2;
    return 1;
  };

  const calculateProjectProgress = (project: Project): number => {
    if (project.status === ProjectStatus.COMPLETED) return 100;
    if (project.status === ProjectStatus.CANCELLED) return 0;
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(Math.round((elapsed / totalDuration) * 100), 95);
  };

const loadProjects = async (reset = false) => {
    try {
      // 1. Set loading state
      if (reset) {
        setLoading(true);
        setRefreshing(true);
      }
      
      // 2. Determine page to fetch
      const currentPage = reset ? 1 : page;
      
      let newProjects: EnhancedProject[] = [];

      // --- Helper: Transform API data to EnhancedProject ---
      const transformProjectData = (project: Project, teamData?: Team): EnhancedProject => {
        // Calculate Progress
        let progress = 0;
        if (project.status === ProjectStatus.COMPLETED) progress = 100;
        else if (project.status === ProjectStatus.CANCELLED) progress = 0;
        else {
          const start = new Date(project.start_date).getTime();
          const end = new Date(project.end_date).getTime();
          const now = new Date().getTime();
          if (now >= end) progress = 100;
          else if (now > start) {
            const total = end - start;
            const elapsed = now - start;
            progress = Math.min(Math.round((elapsed / total) * 100), 95);
          }
        }

        // Calculate Priority
        let priority = 1;
        if (project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED) {
           const days = getDaysRemaining(project.end_date);
           if (days < 0) priority = 4;
           else if (days < 3) priority = 4;
           else if (days < 7) priority = 3;
           else if (days < 14) priority = 2;
        }

        return {
          ...project,
          progress,
          daysRemaining: getDaysRemaining(project.end_date),
          team_name: teamData?.name || project.team_name,
          team_id: teamData?.id || project.team,
          member_count: project.member_count || 0,
          task_count: project.task_count || 0,
          is_favorite: project.is_favorite, // Uses backend value
          priority,
        };
      };

      // --- Fetching Logic ---
      if (isAllProjectsView) {
        const teamsResponse = await teamAPI.getTeams();
        const userTeams = teamsResponse.data;
        setTeams(userTeams);

        // Fetch projects for all teams in parallel
        const teamPromises = userTeams.map(async (team: Team) => {
          try {
            // For "All Projects", we might want to limit per team or fetch all
            // Ideally backend supports /projects/all/ endpoint, but here we loop teams
            const res = await projectAPI.getProjects(team.id);
            const rawProjects = Array.isArray(res.data) ? res.data : (res.data.results || []);
            return rawProjects.map((p: Project) => transformProjectData(p, team));
          } catch (err) {
            console.error(`Error loading projects for team ${team.id}`, err);
            return [];
          }
        });

        const results = await Promise.all(teamPromises);
        newProjects = results.flat();
        
        // For 'All View' aggregated client-side, we disable server pagination for now
        setHasMore(false); 

      } else if (teamId) {
        // Pagination Params
        const params = {
          page: currentPage,
          page_size: 50, // Fetch 50 items
        };

        const [projectsResponse, teamResponse] = await Promise.all([
          projectAPI.getProjects(teamId, params),
          // Only fetch team info on first load/reset
          reset ? teamAPI.getTeam(teamId) : Promise.resolve(null)
        ]);

        if (teamResponse) {
          setTeams([teamResponse.data]);
        }

        // Handle response (support both paginated and list formats)
        const rawData = projectsResponse.data.results || projectsResponse.data;
        newProjects = rawData.map((p: Project) => transformProjectData(p));

        // Update 'hasMore' based on if 'next' link exists
        setHasMore(!!projectsResponse.data.next);
      }
      
      // --- State Updates ---
      if (reset) {
        setProjects(newProjects);
      } else {
        // Append unique projects only
        setProjects(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProjects.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      // Prepare Stats
      const allProjs = reset ? newProjects : [...projects, ...newProjects];
      setProjectStats({
        total: allProjs.length,
        active: allProjs.filter(p => p.status === ProjectStatus.ACTIVE).length,
        completed: allProjs.filter(p => p.status === ProjectStatus.COMPLETED).length,
        planning: allProjs.filter(p => p.status === ProjectStatus.PLANNING).length,
        onHold: allProjs.filter(p => p.status === ProjectStatus.ON_HOLD).length,
        cancelled: allProjs.filter(p => p.status === ProjectStatus.CANCELLED).length,
        archived: allProjs.filter(p => p.status === ProjectStatus.ARCHIVED).length,
      });

      // Increment page for next load
      setPage(currentPage + 1);

    } catch (error) {
      console.error('Failed to load projects:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load projects', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [teamId, location.pathname]);

  // Enhanced filtering and sorting with useMemo
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.team_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    if (filters.team !== 'all') {
      filtered = filtered.filter(project => project.team_id === filters.team);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(project => project.priority === filters.priority);
    }

    if (showFavorites) {
      filtered = filtered.filter(project => project.is_favorite);
    }

    return [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'team':
          aValue = a.team_name || '';
          bValue = b.team_name || '';
          break;
        case 'priority':
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [projects, searchQuery, filters, showFavorites]);

  // Handler functions
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleProjectMenuOpen = (event: React.MouseEvent<HTMLElement>, project: EnhancedProject) => {
    event.stopPropagation();
    setProjectMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
  };

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedProject(null); 
    setDeleteConfirmText('');
  };

  const handleEditClick = () => {
    handleProjectMenuClose();
    setTimeout(() => {
        setEditDialogOpen(true);
    }, 0);
  };

  const handleDeleteClick = () => {
    handleProjectMenuClose();
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleSettingsClick = () => {
    handleProjectMenuClose();
    if (selectedProject && selectedProject.team_id) {
      navigate(`/team/${selectedProject.team_id}/project/${selectedProject.id}/settings`);
      setSelectedProject(null); 
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject || !selectedProject.team_id) return;

    if (!selectedProject.name || deleteConfirmText !== selectedProject.name) {
      setSnackbar({ 
        open: true, 
        message: 'Project name does not match', 
        severity: 'error' 
      });
      return;
    }

    try {
      setDeleteLoading(true);
      await projectAPI.deleteProject(selectedProject.team_id, selectedProject.id);
      setSnackbar({ 
        open: true, 
        message: 'Project deleted successfully', 
        severity: 'success' 
      });
      handleDialogClose(); 
      await loadProjects();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      const message = error.response?.data?.error || 'Failed to delete project';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

// FIXED: Update local state directly instead of reloading everything
  const handleProjectUpdated = (updatedProject: any) => {
    setSnackbar({
      open: true,
      message: 'Project updated successfully!',
      severity: 'success'
    });
    
    // Close dialog first
    handleDialogClose();

    // Update the specific project in the list immediately
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === updatedProject.id) {
        // Merge the existing project data with the updates from the API
        return {
          ...p,
          ...updatedProject,
          // Re-calculate frontend specific fields
          progress: calculateProjectProgress(updatedProject),
          daysRemaining: getDaysRemaining(updatedProject.end_date),
          priority: calculatePriority(updatedProject),
          // Ensure these counts are taken from the fresh response
          member_count: updatedProject.member_count, 
          task_count: updatedProject.task_count
        };
      }
      return p;
    }));
    
    // DO NOT call loadProjects() here. That causes the double load.
  };

const handleCreateProject = (newProject: any) => {
    setSnackbar({
      open: true,
      message: 'Project created successfully!',
      severity: 'success'
    });
    handleDialogClose();
    
    // enhance the new project with frontend fields
    const enhancedProject: EnhancedProject = {
      ...newProject,
      progress: calculateProjectProgress(newProject),
      daysRemaining: getDaysRemaining(newProject.end_date),
      priority: calculatePriority(newProject),
      team_name: teams.find(t => t.id === newProject.team)?.name, // Look up team name
      member_count: newProject.member_count || 1, // Default to 1 (creator)
      task_count: 0,
      is_favorite: false
    };

    // Add to list immediately
    setProjects(prev => [enhancedProject, ...prev]);
    
    // Update stats locally
    setProjectStats(prev => ({
      ...prev,
      total: prev.total + 1,
      planning: prev.planning + 1 // Assuming new projects start in planning
    }));
  };

// Inside ProjectList.tsx component

  const toggleFavorite = async (project: EnhancedProject, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // 1. Optimistic Update (Update UI immediately for speed)
    const previousProjects = [...projects];
    setProjects(prev => prev.map(p => 
      p.id === project.id ? { ...p, is_favorite: !p.is_favorite } : p
    ));

    try {
      // 2. Call API
      if (!project.team_id) throw new Error("Team ID missing");
      await projectAPI.toggleFavorite(project.team_id, project.id);
      

    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      
      // 3. Revert UI on error
      setProjects(previousProjects);
      setSnackbar({ 
        open: true, 
        message: 'Failed to update favorite status', 
        severity: 'error' 
      });
    }
  };

  const getHeaderTitle = () => {
    if (isAllProjectsView) return 'All Projects';
    if (currentTeam) return `${currentTeam.name} Projects`;
    return 'Projects';
  };

  const getHeaderSubtitle = () => {
    if (isAllProjectsView) return 'Projects across all your teams';
    if (currentTeam) return currentTeam.description || 'Team projects and initiatives';
    return 'Manage and organize your work';
  };

  // Enhanced header actions with better mobile support
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {!isMobile && (
        <Tooltip title="Dashboard">
          <IconButton 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': { backgroundColor: 'grey.50' }
            }}
          >
            <DashboardIcon />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Refresh">
        <span>
          <IconButton 
            onClick={() => loadProjects(true)}
            disabled={refreshing}
            sx={{ 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': { backgroundColor: 'grey.50' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>

      {!isMobile && <QuickActionsMenu />}
    </Box>
  );

  // Calculate grid columns based on screen size and view mode
  const getGridColumns = () => {
    if (viewMode === 'compact') {
      if (isSmallMobile) return 6;
      if (isMobile) return 4;
      return 3;
    }
    
    if (isSmallMobile) return 12;
    if (isMobile) return 6;
    if (isTablet) return 4;
    return 3;
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
          <Typography variant="h6" color="text.secondary" fontWeight="500">
            Loading projects...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <CommonHeader 
        showBackButton
        backButtonPath={teamId ? `/team/${teamId}` : '/dashboard'}
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        customActions={headerActions}
        variant="page"
        sx={{
          minHeight: isMobile ? 80 : 100,
          py: isMobile ? 1.5 : 2,
        }}
      />

      <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 1.5, px: { xs: 1, sm: 2, md: 3 } }}>
        
      {/* Enhanced Statistics Cards with Indicators */}
      <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 2 : 3 }}>
        {[
          { 
            key: 'total', 
            label: 'Total Projects', 
            value: projectStats.total, 
            color: 'primary' as const,
            icon: <FolderIcon />,
            indicator: {
              icon: <GroupsIcon sx={{ fontSize: 12 }} />,
              value: teams.length,
              label: 'teams',
              bgColor: 'primary.50',
              textColor: 'primary.main'
            }
          },
          { 
            key: 'active', 
            label: 'Active', 
            value: projectStats.active, 
            color: 'success' as const,
            icon: <PlayIcon />,
            indicator: {
              icon: <TrendingUpIcon sx={{ fontSize: 12 }} />,
              value: `${Math.round((projectStats.active / projectStats.total) * 100) || 0}%`,
              label: 'of total',
              bgColor: 'success.50',
              textColor: 'success.main'
            }
          },
          { 
            key: 'completed', 
            label: 'Completed', 
            value: projectStats.completed, 
            color: 'info' as const,
            icon: <CheckCircleIcon />,
            indicator: {
              icon: <CalendarIcon sx={{ fontSize: 12 }} />,
              value: projectStats.completed > 0 ? '✓' : '--',
              label: 'done',
              bgColor: 'info.50',
              textColor: 'info.main'
            }
          },
          { 
            key: 'planning', 
            label: 'Planning', 
            value: projectStats.planning, 
            color: 'default' as const,
            icon: <PlanningIcon />,
            indicator: {
              icon: <PauseIcon sx={{ fontSize: 12 }} />, // Changed to PauseIcon for "on hold"
              value: projectStats.onHold,
              label: 'on hold',
              bgColor: 'warning.50', // Changed to warning color for on hold
              textColor: 'warning.main'
            }
          },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.key}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                '&:last-child': { pb: isMobile ? 1.5 : 2 }
              }}>
                {/* Original Icon Box */}
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: `${stat.color}.50`,
                  color: `${stat.color}.main`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  {React.cloneElement(stat.icon, { sx: { fontSize: isMobile ? 20 : 24 } })}
                </Box>
                
                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color={`${stat.color}.main`}
                    sx={{ 
                      lineHeight: 1.1, 
                      mb: 0.5, 
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    {stat.label}
                  </Typography>
                </Box>

                {/* Indicator - Simple top-right text */}
                <Box sx={{ 
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Typography 
                    variant="caption" 
                    fontWeight="700"
                    sx={{ 
                      color: stat.indicator.textColor,
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      whiteSpace: 'nowrap',
                      backgroundColor: stat.indicator.bgColor,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    {React.cloneElement(stat.indicator.icon, { 
                      sx: { fontSize: isMobile ? 10 : 12 } 
                    })}
                    {stat.indicator.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
{/* Enhanced Controls Bar - Fixed for mobile */}
<Paper 
  sx={{ 
    borderRadius: 2, 
    backgroundColor: 'white', 
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid',
    borderColor: 'divider',
    p: isMobile ? 1.5 : 2, 
    mb: 3
  }}
>
  <Box sx={{ 
    display: 'flex', 
    flexDirection: isMobile ? 'row' : 'row', // Always row, never column
    gap: isMobile ? 1 : 2,
    alignItems: 'center',
    flexWrap: isMobile ? 'nowrap' : 'nowrap' // Never wrap on mobile
  }}>
    {/* Search Bar - Compact on mobile */}
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      flex: isMobile ? 1 : 1, // Takes available space
      minWidth: 0 // Allows shrinking
    }}>
      <TextField
        placeholder={isMobile ? "Search..." : "Search projects..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': { 
            borderRadius: 1.5,
            height: isMobile ? 36 : 44,
            fontSize: isMobile ? '0.875rem' : '1rem'
          },
          '& .MuiInputBase-input': {
            fontSize: isMobile ? '0.875rem' : '1rem'
          }
        }}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" fontSize={isMobile ? "small" : "medium"} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton 
                size="small" 
                onClick={() => setSearchQuery('')}
                sx={{ p: 0.5 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>

    {/* Mobile Filter Button - Next to search */}
    {isMobile && (
      <Tooltip title="Filters">
        <IconButton
          onClick={() => setFilterDrawerOpen(true)}
          sx={{
            backgroundColor: 'action.hover',
            borderRadius: 1.5,
            height: 36,
            width: 36,
            flexShrink: 0,
            ml: -0.5 // Bring it closer to search bar
          }}
        >
          <FilterIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}

    {/* Controls - Always in single row */}
    <Box sx={{ 
      display: 'flex', 
      gap: 0.5, 
      alignItems: 'center', 
      flexShrink: 0, // Prevent shrinking
      ml: isMobile ? 'auto' : 0 // Push to right on mobile
    }}>
      {/* Desktop Filters */}
      {!isMobile && (
        <>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value="all">All</MenuItem>
              {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
                <MenuItem key={status} value={parseInt(status)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {React.cloneElement(config.icon, { sx: { color: config.iconColor, fontSize: 16 } })}
                    {config.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isAllProjectsView && teams.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Team</InputLabel>
              <Select
                value={filters.team}
                label="Team"
                onChange={(e) => handleFilterChange('team', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="all">All</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={filters.sortBy}
              label="Sort"
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value="created_at">Newest</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
            <IconButton 
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              sx={{ 
                backgroundColor: 'action.hover',
                borderRadius: 1.5
              }}
            >
              <SortIcon />
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* Favorites Toggle */}
      <Tooltip title={showFavorites ? "Show all" : "Favorites only"}>
        <IconButton
          onClick={() => setShowFavorites(!showFavorites)}
          sx={{
            color: showFavorites ? 'warning.main' : 'text.secondary',
            flexShrink: 0,
            p: 0.75
          }}
        >
          <StarIcon fontSize={isMobile ? "small" : "medium"} />
        </IconButton>
      </Tooltip>

      {/* Single View Mode Toggle Button */}
      <Tooltip title={`Switch view (Current: ${viewMode === 'compact' ? 'Compact' : viewMode === 'grid' ? 'Grid' : 'List'})`}>
        <IconButton
          onClick={() => {
            // Cycle through view modes: compact → grid → list → compact
            if (viewMode === 'compact') setViewMode('grid');
            else if (viewMode === 'grid') setViewMode('list');
            else setViewMode('compact');
          }}
          sx={{
            backgroundColor: 'grey.50',
            borderRadius: 1.5,
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'grey.100',
            },
            p: 0.75
          }}
        >
          {viewMode === 'compact' && <CompactIcon fontSize={isMobile ? "small" : "medium"} />}
          {viewMode === 'grid' && <GridIcon fontSize={isMobile ? "small" : "medium"} />}
          {viewMode === 'list' && <ListIcon fontSize={isMobile ? "small" : "medium"} />}
        </IconButton>
      </Tooltip>

      {/* New Project Button - Compact on mobile */}
      <Button
        variant="contained"
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          borderRadius: 1.5,
          px: isMobile ? 1 : 1.5,
          py: isMobile ? 0.6 : 1,
          textTransform: 'none',
          fontWeight: '600',
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          minWidth: isMobile ? 36 : 'auto',
          height: isMobile ? 36 : 40,
          flexShrink: 0
        }}
      >
        {isMobile ? '+' : 'New Project'}
      </Button>
    </Box>
  </Box>

  {/* Active Filters - Only show when filters are active */}
  {(searchQuery || filters.status !== 'all' || filters.team !== 'all' || filters.priority !== 'all' || showFavorites) && (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.5 }}>
      {searchQuery && (
        <Chip 
          label={`Search: "${searchQuery}"`} 
          size="small" 
          onDelete={() => setSearchQuery('')}
        />
      )}
      {filters.status !== 'all' && (
        <Chip 
          label={`Status: ${PROJECT_STATUS_CONFIG[filters.status]?.label}`} 
          size="small" 
          onDelete={() => handleFilterChange('status', 'all')}
        />
      )}
      {filters.team !== 'all' && (
        <Chip 
          label={`Team: ${teams.find(t => t.id === filters.team)?.name}`} 
          size="small" 
          onDelete={() => handleFilterChange('team', 'all')}
        />
      )}
      {filters.priority !== 'all' && (
        <Chip 
          label={`Priority: ${PRIORITY_CONFIG[filters.priority]?.label}`} 
          size="small" 
          onDelete={() => handleFilterChange('priority', 'all')}
        />
      )}
      {showFavorites && (
        <Chip 
          label="Favorites Only" 
          size="small" 
          onDelete={() => setShowFavorites(false)}
        />
      )}
    </Box>
  )}
</Paper>

        {/* Results Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
            Showing {filteredProjects.length} of {projects.length} projects
            {isAllProjectsView && ` across ${teams.length} teams`}
          </Typography>
        </Box>

        {/* Enhanced Projects Display */}
        {filteredProjects.length === 0 ? (
          <Paper sx={{ 
            p: isMobile ? 4 : 6, 
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <FolderIcon sx={{ fontSize: isMobile ? 60 : 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom fontWeight="600" sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
              No Projects Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3, maxWidth: 400, mx: 'auto', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {searchQuery || filters.status !== 'all' || filters.team !== 'all'
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Create your first project to start organizing your work.'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                borderRadius: 1.5,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              Create New Project
            </Button>
          </Paper>
        ) : viewMode === 'list' ? (
          /* List View */
          <Box>
            {filteredProjects.map((project) => (
              <ProjectListItem 
                key={project.id} 
                project={project} 
                onMenuOpen={handleProjectMenuOpen}
                onToggleFavorite={toggleFavorite}
                isAllProjectsView={isAllProjectsView}
              />
            ))}
          </Box>
        ) : (
          /* Grid/Compact View */
          <Grid container spacing={isMobile ? 1.5 : 2}>
            {filteredProjects.map((project) => (
              <Grid item xs={getGridColumns()} key={project.id}>
                <ProjectCard 
                  project={project} 
                  onMenuOpen={handleProjectMenuOpen}
                  onToggleFavorite={toggleFavorite}
                  isAllProjectsView={isAllProjectsView}
                  compact={viewMode === 'compact'}
                />
              </Grid>
            ))}
          </Grid>
        )}
        {/* Inside render, at the bottom of the list */}
        {hasMore && (
          <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => loadProjects(false)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More Projects'}
            </Button>
          </Box>
        )}

        {/* Filter Drawer for Mobile */}
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
          teams={teams}
          isAllProjectsView={isAllProjectsView}
        />

        {/* Dialogs and Menus */}
        <CreateProjectDialog
          open={createDialogOpen}
          onClose={handleDialogClose}
          onProjectCreated={handleCreateProject}
          teamId={teamId}
        />

        {selectedProject && (
          <EditProjectDialog
            open={editDialogOpen}
            onClose={handleDialogClose}
            onProjectUpdated={handleProjectUpdated}
            project={selectedProject}
            teamId={selectedProject.team_id}
            teams={teams}
          />
        )}

        <Menu
          anchorEl={projectMenuAnchor}
          open={Boolean(projectMenuAnchor)}
          onClose={handleProjectMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { 
              borderRadius: 2,
              minWidth: 180,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
              mt: 0.5,
            }
          }}
        >
          <MenuItem 
            onClick={handleEditClick}
            sx={{ py: 1.2 }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Edit Project
            </Typography>
          </MenuItem>
          
          <MenuItem 
            onClick={handleSettingsClick}
            sx={{ py: 1.2 }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Project Settings
            </Typography>
          </MenuItem>

          <Divider />

          <MenuItem 
            onClick={handleDeleteClick}
            sx={{ 
              py: 1.2,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.50',
              }
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <Typography variant="body2" fontWeight="500">
              Delete Project
            </Typography>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleDialogClose}
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
            backgroundColor: 'error.main',
            color: 'white',
            fontWeight: '700',
            py: 2.5
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DeleteIcon />
              Delete Project
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2, 
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'warning.light',
                mt: 1
              }}
            >
              This action cannot be undone. This will permanently delete the project and all associated tasks, subtasks, and data.
            </Alert>
            
            <Typography variant="body1" paragraph>
              Please type <strong>{selectedProject?.name || 'the project name'}</strong> to confirm deletion.
            </Typography>
            
            <TextField
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${selectedProject?.name || 'project name'}" to confirm`}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 1.5,
                  '&:focus-within fieldset': {
                    borderColor: 'error.main',
                    borderWidth: 2
                  }
                }
              }}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={handleDialogClose}
              disabled={deleteLoading}
              sx={{ 
                borderRadius: 1.5,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: '500'
              }}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleDeleteConfirm}
              disabled={!selectedProject?.name || deleteConfirmText !== selectedProject?.name || deleteLoading}
              variant="contained"
              color="error"
              startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
              sx={{ 
                borderRadius: 1.5,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: '600'
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity={snackbar.severity} 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ 
              borderRadius: 1.5,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
              alignItems: 'center'
            }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Floating Action Button for Mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="create project"
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 24px rgba(37, 99, 235, 0.4)',
              }
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>
    </Box>
  );
};

export default ProjectList;