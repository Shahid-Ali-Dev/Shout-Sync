// src/components/dialogs/CreateProjectDialog.tsx - OPTIMIZED VERSION
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  FormHelperText,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Paper,
  Tabs,
  Tab,
  Stack,
  Fade,
  Grid,
  Grow,
  AvatarGroup,
  Badge,
  LinearProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  debounce,
  ClickAwayListener,
  Popper,
  Autocomplete,
  Skeleton,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  Close as CloseIcon,
  Groups as TeamsIcon,
  Rocket as RocketIcon,
  Group as GroupsIcon,
  Warning as WarningIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Star as StarIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  HowToReg as ContributorIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronRight as ChevronRightIcon,
  AddCircle as AddCircleIcon,
  Workspaces as WorkspacesIcon,
  Diversity3 as Diversity3Icon,
  EmojiPeople as EmojiPeopleIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { projectAPI } from '../../shared/services/projectAPI';
import { teamAPI } from '../../shared/services/teamAPI';
import { useSelector } from 'react-redux';
import { RootState } from '../../shared/store/store';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  member_count: number;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string | null; 
}

interface TeamMember {
  id: string;
  user: User;
  role: number;
}

interface TeamMemberUser extends User {
  teamRole: number;
}

interface Assignee {
  id: string;
  user: User;
  role: number;
  isLead?: boolean;
}

const PROJECT_STATUS_OPTIONS = [
  { value: 1, label: 'Planning', color: 'default', icon: '📋' },
  { value: 2, label: 'Active', color: 'success', icon: '🚀' },
  { value: 3, label: 'On Hold', color: 'warning', icon: '⏸️' },
  { value: 4, label: 'Completed', color: 'info', icon: '✅' },
  { value: 5, label: 'Cancelled', color: 'error', icon: '❌' },
];

const ASSIGNEE_ROLES = [
  { 
    value: 1, 
    label: 'Contributor', 
    description: 'Works on tasks and reports progress',
    icon: <ContributorIcon fontSize="small" />, 
    color: 'default' as const,
    badgeColor: '#6B7280',
  },
  { 
    value: 2, 
    label: 'Manager', 
    description: 'Manages tasks and team coordination',
    icon: <ManagerIcon fontSize="small" />, 
    color: 'primary' as const,
    badgeColor: '#3B82F6',
  },
  { 
    value: 3, 
    label: 'Lead', 
    description: 'Project lead with full access',
    icon: <AdminIcon fontSize="small" />, 
    color: 'warning' as const,
    badgeColor: '#F59E0B',
  },
];

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onClose,
  onProjectCreated,
  teamId
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{[key: string]: TeamMember[]}>({});
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<number | 'all'>('all');
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // New state for optimized loading
  const [searchResults, setSearchResults] = useState<TeamMemberUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreMembers, setHasMoreMembers] = useState(true);
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
  const defaultEndDateString = defaultEndDate.toISOString().split('T')[0];

  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: today,
    end_date: defaultEndDateString,
    status: 1,
    team: teamId || '',
  });

const loadTeams = useCallback(async () => {
  try {
    setTeamsLoading(true);
    const response = await teamAPI.getTeams();
    const teamsData: Team[] = response.data;
    setTeams(teamsData);
    
    // Auto-select the team if teamId is provided
    if (teamId && teamsData.length > 0) {
      const targetTeam = teamsData.find(team => team.id === teamId);
      if (targetTeam) {
        setProjectData(prev => ({ ...prev, team: teamId }));
        
        // OPTIMIZED: Load team member count only
        try {
          const membersResponse = await teamAPI.getTeamMembersOptimized(teamId, 1, 1);
          setTotalMembers(membersResponse.data.total || 0);
        } catch (error) {
          console.error('Failed to load team members count:', error);
          setTotalMembers(0);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load teams:', error);
    setError('Failed to load teams. Please try again.');
  } finally {
    setTeamsLoading(false);
  }
}, [teamId]);

  // Optimized search function with debouncing
const searchMembers = useCallback(async (query: string, page: number = 1) => {
  if (!projectData.team) return;
  
  try {
    setSearchLoading(true);
    const response = await teamAPI.searchTeamMembers(
      projectData.team, 
      query, 
      page,
      selectedRoleFilter !== 'all' ? selectedRoleFilter : undefined
    );
    
    const data = response.data.results || response.data;
    const total = response.data.total || data.length;
    
    setTotalMembers(total);
    setHasMoreMembers(response.data.has_next || false);
    
    // Format members
    const formattedMembers = data.map((member: any) => ({
      ...member.user,
      teamRole: member.role,
    }));
    
    if (page === 1) {
      setSearchResults(formattedMembers);
    } else {
      setSearchResults(prev => [...prev, ...formattedMembers]);
    }
    setSearchPage(page);
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    setSearchLoading(false);
  }
}, [projectData.team, selectedRoleFilter]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      searchMembers(query, 1);
    }, 300),
    [searchMembers]
  );

  // Load teams when dialog opens
  useEffect(() => {
    if (open) {
      loadTeams();
      setAssignees([]);
      setActiveTab(0);
      setSearchQuery('');
      setSelectedRoleFilter('all');
      setSearchResults([]);
      setSearchPage(1);
      setSearchOpen(false);
    }
  }, [open, loadTeams]);

  // Auto-add creator as lead
  useEffect(() => {
    if (open && user && projectData.team && assignees.length === 0) {
      const creatorMember = searchResults.find(m => m.id === user.id);
      if (creatorMember) {
        // Add creator as Lead with animation
        setTimeout(() => {
          handleAddAssignee(user, 3, true);
        }, 300);
      }
    }
  }, [open, user, projectData.team, assignees.length, searchResults]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    
    if (projectData.team) {
      setSearchOpen(true);
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, projectData.team, debouncedSearch]);

  const handleTeamChange = async (teamId: string) => {
    setProjectData(prev => ({ ...prev, team: teamId }));
    setAssignees([]);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    
    // Load team member count
    try {
      const membersResponse = await teamAPI.getTeamMembersOptimized(teamId, 1, 1);
      setTotalMembers(membersResponse.data.total || 0);
    } catch (error) {
      console.error('Failed to load team members count:', error);
      setTotalMembers(0);
    }
    
    // Auto-add creator as Lead
    if (user) {
      setTimeout(() => {
        if (user) {
          handleAddAssignee(user, 3, true);
        }
      }, 300);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAssignee = (user: User, role: number = 1, isCreator: boolean = false) => {
    // Check if already added
    if (assignees.some(assignee => assignee.user.id === user.id)) {
      return;
    }

    const newAssignee: Assignee = {
      id: user.id,
      user,
      role,
      isLead: role === 3
    };
    
    setIsAnimating(true);
    setAssignees(prev => [...prev, newAssignee]);
    setSearchOpen(false);
    setSearchQuery('');
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleRemoveAssignee = (userId: string, isCreator: boolean = false) => {
    // Don't allow removing creator if they're the only assignee
    if (isCreator && assignees.length === 1) {
      setError('You cannot remove yourself as the only assignee');
      return;
    }
    
    setIsAnimating(true);
    setAssignees(prev => prev.filter(assignee => assignee.user.id !== userId));
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleUpdateAssigneeRole = (userId: string, newRole: number) => {
    setAssignees(prev => 
      prev.map(assignee => 
        assignee.user.id === userId 
          ? { ...assignee, role: newRole, isLead: newRole === 3 }
          : assignee
      )
    );
  };

  // Get available team members from search results (excluding already selected)
  const getAvailableMembers = useMemo(() => {
    return searchResults.filter(member => 
      !assignees.some(selected => selected.user.id === member.id)
    );
  }, [searchResults, assignees]);

  // Get user role for selected team
  const selectedTeamMember = useMemo(() => {
    return searchResults.find(m => m.id === user?.id);
  }, [searchResults, user]);

  const userRole = selectedTeamMember?.teamRole;
  const userRoleName = userRole === 1 ? 'Owner' : 
                      userRole === 2 ? 'Admin' : 
                      userRole === 3 ? 'Member' : 
                      userRole === 4 ? 'Guest' : 'Unknown';

  // Check if user can add assignees (Owners/Admins only)
  const canAddAssignees = userRole && userRole <= 2;

  // Get the selected team name for display
  const selectedTeam = teams.find(team => team.id === projectData.team);

  const canCreateProject = (): boolean => {
    if (!projectData.name.trim()) return false;
    if (!projectData.team) return false;
    if (permissionError) return false;

    if (projectData.start_date && projectData.end_date) {
      const startDate = new Date(projectData.start_date);
      const endDate = new Date(projectData.end_date);
      
      if (endDate < startDate) {
        return false;
      }
    }

    return true;
  };

  const validateForm = (): boolean => {
    if (!projectData.name.trim()) {
      setError('Project name is required');
      return false;
    }
    if (!projectData.team) {
      setError('Please select a team');
      return false;
    }

    if (projectData.start_date && projectData.end_date) {
      const startDate = new Date(projectData.start_date);
      const endDate = new Date(projectData.end_date);
      
      if (endDate < startDate) {
        setError('End date cannot be before start date');
        return false;
      }
    }

    if (permissionError) {
      return false;
    }

    setError(null);
    return true;
  };

const handleCreateProject = async () => {
  if (!validateForm()) return;

  try {
    setLoading(true);
    setError(null);

    const assigneeData = {
      assignee_ids: [] as string[],
      assignee_roles: [] as number[],
    };

    // Always include creator as assignee
    if (user) {
      assigneeData.assignee_ids.push(user.id);
      assigneeData.assignee_roles.push(3); // Default to Lead
    }

    // Add other assignees if user has permission
    if (canAddAssignees) {
      const otherAssignees = assignees.filter(a => a.user.id !== user?.id);
      otherAssignees.forEach(assignee => {
        assigneeData.assignee_ids.push(assignee.user.id);
        assigneeData.assignee_roles.push(assignee.role);
      });
    }

    const formattedData = {
      name: projectData.name.trim(),
      description: projectData.description.trim(),
      start_date: new Date(projectData.start_date).toISOString(),
      end_date: new Date(projectData.end_date).toISOString(),
      status: projectData.status,
      team: projectData.team,
      ...assigneeData
    };

    // Use optimized endpoint
    const response = await projectAPI.createProjectOptimized(projectData.team, formattedData);

    if (onProjectCreated) {
      onProjectCreated(response.data);
    }

    handleClose();
    
  } catch (error: any) {
    console.error('Project creation failed:', error);
    
    let message = 'Failed to create project';
    if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error.response?.status === 403) {
      message = 'You do not have permission to create projects. Please contact your team admin.';
    }
    
    setError(message);
  } finally {
    setLoading(false);
  }
};

  const handleClose = () => {
    setProjectData({
      name: '',
      description: '',
      start_date: today,
      end_date: defaultEndDateString,
      status: 1,
      team: teamId || '',
    });
    setAssignees([]);
    setError(null);
    setPermissionError(null);
    setActiveTab(0);
    setSearchQuery('');
    setSelectedRoleFilter('all');
    setIsAnimating(false);
    setSearchResults([]);
    setSearchOpen(false);
    onClose();
  };

  const loadMoreMembers = () => {
    if (hasMoreMembers && !searchLoading) {
      searchMembers(searchQuery, searchPage + 1);
    }
  };

  const RoleBadge = ({ role, size = 'small' }: { role: number, size?: 'small' | 'medium' }) => {
    const roleConfig = ASSIGNEE_ROLES.find(r => r.value === role) || ASSIGNEE_ROLES[0];
    
    return (
      <Chip
        icon={roleConfig.icon}
        label={roleConfig.label}
        size={size}
        sx={{
          backgroundColor: `${roleConfig.badgeColor}15`,
          color: roleConfig.badgeColor,
          border: `1px solid ${roleConfig.badgeColor}30`,
          fontWeight: 600,
          '& .MuiChip-icon': {
            color: roleConfig.badgeColor,
          }
        }}
      />
    );
  };

  const TeamRoleBadge = ({ role }: { role: number }) => {
    const roleNames: Record<number, string> = {
      1: 'Owner',
      2: 'Admin',
      3: 'Member',
      4: 'Guest',
    };
    
    const colors: Record<number, string> = {
      1: '#EF4444',
      2: '#3B82F6',
      3: '#10B981',
      4: '#6B7280',
    };
    
    const color = colors[role] || colors[3];
    
    return (
      <Chip
        label={roleNames[role] || 'Member'}
        size="small"
        sx={{
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}30`,
          fontWeight: 500,
          fontSize: '0.7rem',
        }}
      />
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 4,
          overflow: 'hidden',
          maxHeight: '90vh',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }
      }}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 100 }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        fontWeight: '700',
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Box sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <RocketIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="800">
              Create New Project
            </Typography>
            {selectedTeam && (
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <WorkspacesIcon sx={{ fontSize: 12 }} />
                  {selectedTeam.name}
                </Box>
                {' • '}
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <EmojiPeopleIcon sx={{ fontSize: 12 }} />
                  {totalMembers} members
                </Box>
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          onClick={handleClose}
          sx={{ 
            color: 'white',
            minWidth: 'auto',
            p: 0.5,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mx: 3, 
            mt: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          background: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ 
              px: 3,
              minHeight: 64,
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 600,
                fontSize: '0.95rem',
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#4f46e5',
                }
              }
            }}
            TabIndicatorProps={{
              sx: {
                backgroundColor: '#4f46e5',
                height: 3,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ProjectIcon fontSize="small" />
                  Basic Info
                </Box>
              }
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon fontSize="small" />
                  Team Members
                  {assignees.length > 0 && (
                    <Badge
                      badgeContent={assignees.length}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: 18,
                          minWidth: 18,
                          right: -6,
                        }
                      }}
                    />
                  )}
                </Box>
              }
              disabled={!projectData.team}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 4 }}>
          {activeTab === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {!teamId || teams.length > 1 ? (
                <FormControl fullWidth required error={!projectData.team && teams.length > 0}>
                  <InputLabel>Select Team</InputLabel>
                  <Select
                    value={projectData.team}
                    label="Select Team"
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={teamsLoading}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db',
                      }
                    }}
                    renderValue={(value) => {
                      const team = teams.find(t => t.id === value);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <TeamsIcon sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="600">
                              {team?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team?.member_count} members
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <TeamsIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight="600">
                              {team.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team.member_count} members
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Select the team this project belongs to
                  </FormHelperText>
                </FormControl>
              ) : (
                <Paper sx={{ 
                  p: 3, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <TeamsIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600" color="primary.main">
                        Creating project in:
                      </Typography>
                      <Typography variant="h6" fontWeight="700" sx={{ mt: 0.5 }}>
                        {selectedTeam?.name}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              <TextField
                label="Project Name"
                required
                fullWidth
                value={projectData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter a descriptive project name"
                helperText="Choose a name that clearly describes your project"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4f46e5',
                      borderWidth: 2,
                    }
                  } 
                }}
                disabled={!projectData.team}
                autoFocus
              />

              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                value={projectData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your project goals, objectives, and key deliverables..."
                helperText="This helps team members understand the project's purpose and scope"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4f46e5',
                      borderWidth: 2,
                    }
                  } 
                }}
                disabled={!projectData.team}
              />

              <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                <TextField
                  label="Start Date"
                  type="date"
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={projectData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4f46e5',
                        borderWidth: 2,
                      }
                    } 
                  }}
                  disabled={!projectData.team}
                />
                <TextField
                  label="End Date"
                  type="date"
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={projectData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4f46e5',
                        borderWidth: 2,
                      }
                    } 
                  }}
                  disabled={!projectData.team}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Initial Status</InputLabel>
                <Select
                  value={projectData.status}
                  label="Initial Status"
                  onChange={(e) => handleInputChange('status', e.target.value as number)}
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e5e7eb',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db',
                    }
                  }}
                  disabled={!projectData.team}
                  renderValue={(value) => {
                    const status = PROJECT_STATUS_OPTIONS.find(opt => opt.value === value);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%',
                          backgroundColor: status?.color === 'success' ? '#10B981' :
                                         status?.color === 'warning' ? '#F59E0B' :
                                         status?.color === 'error' ? '#EF4444' :
                                         status?.color === 'info' ? '#3B82F6' : '#6B7280',
                        }} />
                        <Typography variant="body2" fontWeight="600">
                          {status?.label}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  {PROJECT_STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>
                          {status.icon}
                        </Typography>
                        <Box>
                          <Typography variant="body2" fontWeight="600">
                            {status.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {status.value === 1 ? 'Project is in planning phase' :
                             status.value === 2 ? 'Project is actively being worked on' :
                             status.value === 3 ? 'Project is temporarily paused' :
                             status.value === 4 ? 'Project has been completed' :
                             'Project has been cancelled'}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Set the initial status for this project
                </FormHelperText>
              </FormControl>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}>
                <Box>
                  <Typography variant="h6" fontWeight="700" gutterBottom>
                    Team Members
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add team members and assign their roles
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AvatarGroup 
                    max={4} 
                    sx={{ 
                      '& .MuiAvatar-root': { 
                        width: 32, 
                        height: 32,
                        fontSize: '0.875rem',
                        border: '2px solid white',
                      } 
                    }}
                  >
                    {assignees.map((assignee) => (
                      <Tooltip 
                        key={assignee.user.id} 
                        title={`${assignee.user.first_name} ${assignee.user.last_name}`}
                      >
                        <Avatar src={assignee.user.avatar || undefined}>
                          {assignee.user.first_name?.[0]}{assignee.user.last_name?.[0]}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                  <Typography variant="body2" color="primary.main" fontWeight="600">
                    {assignees.length} {assignees.length === 1 ? 'member' : 'members'}
                  </Typography>
                </Box>
              </Box>

              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
                  Selected Members
                </Typography>
                
                {assignees.length === 0 ? (
                  <Box sx={{ 
                    p: 4, 
                    textAlign: 'center', 
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                  }}>
                    <Diversity3Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1" color="text.secondary" fontWeight="500" gutterBottom>
                      No team members added yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start adding team members below to build your project team
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {assignees.map((assignee, index) => (
                      <Grow in={true} timeout={(index + 1) * 100} key={assignee.user.id}>
                        <Paper 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2,
                            backgroundColor: 'white',
                            border: '1px solid',
                            borderColor: assignee.user.id === user?.id ? 'primary.main' : 'divider',
                            boxShadow: assignee.user.id === user?.id 
                              ? '0 2px 8px rgba(79, 70, 229, 0.15)' 
                              : '0 1px 3px rgba(0, 0, 0, 0.08)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                              transform: 'translateY(-1px)',
                            }
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 2,
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                              <Avatar 
                                src={assignee.user.avatar || undefined}
                                sx={{ 
                                  width: 48, 
                                  height: 48,
                                  border: assignee.user.id === user?.id ? '2px solid #4f46e5' : 'none',
                                }}
                              >
                                {assignee.user.first_name?.[0]}{assignee.user.last_name?.[0]}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography variant="subtitle1" fontWeight="600">
                                    {assignee.user.first_name} {assignee.user.last_name}
                                  </Typography>
                                  {assignee.user.id === user?.id && (
                                    <Chip 
                                      label="You" 
                                      size="small" 
                                      sx={{ 
                                        backgroundColor: 'primary.50',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                        height: 20,
                                      }} 
                                    />
                                  )}
                                  {assignee.isLead && (
                                    <Tooltip title="Project Lead">
                                      <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                                    </Tooltip>
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {assignee.user.email}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FormControl size="small" sx={{ minWidth: 140 }}>
                                <Select
                                  value={assignee.role}
                                  onChange={(e) => handleUpdateAssigneeRole(assignee.user.id, e.target.value as number)}
                                  sx={{ 
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#e5e7eb',
                                    }
                                  }}
                                  renderValue={(value) => {
                                    const role = ASSIGNEE_ROLES.find(r => r.value === value);
                                    return (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {role?.icon}
                                        <Typography variant="body2" fontWeight="500">
                                          {role?.label}
                                        </Typography>
                                      </Box>
                                    );
                                  }}
                                >
                                  {ASSIGNEE_ROLES.map((role) => (
                                    <MenuItem key={role.value} value={role.value}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                                        <Box sx={{ 
                                          width: 32, 
                                          height: 32, 
                                          borderRadius: '50%',
                                          backgroundColor: `${role.badgeColor}15`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}>
                                          {role.icon}
                                        </Box>
                                        <Box>
                                          <Typography variant="body2" fontWeight="500">
                                            {role.label}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {role.description}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              
                              {assignee.user.id !== user?.id && (
                                <Tooltip title="Remove member">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleRemoveAssignee(assignee.user.id, assignee.user.id === user?.id)}
                                    sx={{ 
                                      color: 'error.main',
                                      backgroundColor: 'error.50',
                                      '&:hover': {
                                        backgroundColor: 'error.100',
                                      }
                                    }}
                                  >
                                    <PersonRemoveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      </Grow>
                    ))}
                  </Stack>
                )}
              </Paper>

              {canAddAssignees && (
                <>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
                      Add Team Members
                    </Typography>
                    
                    <Paper sx={{ 
                      p: 2, 
                      mb: 3, 
                      borderRadius: 2,
                      backgroundColor: 'white',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                        <Box sx={{ flex: 1, position: 'relative' }} ref={searchAnchorRef}>
                          <TextField
                            fullWidth
                            placeholder="Search team members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc',
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                </InputAdornment>
                              ),
                              endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => setSearchQuery('')}
                                  >
                                    <ClearIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                          
                          <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
                            <Popper
                              open={searchOpen}
                              anchorEl={searchAnchorRef.current}
                              placement="bottom-start"
                              style={{ 
                                zIndex: 1300, 
                                width: searchAnchorRef.current?.clientWidth,
                                maxHeight: 400,
                                overflowY: 'auto'
                              }}
                            >
                              <Paper sx={{ 
                                mt: 1, 
                                borderRadius: 2,
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}>
                                {searchLoading ? (
                                  <Box sx={{ p: 2 }}>
                                    {[1, 2, 3].map((i) => (
                                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Skeleton variant="circular" width={40} height={40} />
                                        <Box sx={{ flex: 1 }}>
                                          <Skeleton variant="text" width="60%" />
                                          <Skeleton variant="text" width="40%" />
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                ) : getAvailableMembers.length === 0 ? (
                                  <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography color="text.secondary">
                                      {searchQuery ? 'No members found' : 'Type to search team members'}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <>
                                    <List dense>
                                      {getAvailableMembers.map((member) => (
                                        <ListItem 
                                          key={member.id}
                                          button
                                          onClick={() => handleAddAssignee(member)}
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: 'action.hover',
                                            }
                                          }}
                                        >
                                          <ListItemAvatar>
                                            <Avatar src={member.avatar || undefined}>
                                              {member.first_name?.[0]}{member.last_name?.[0]}
                                            </Avatar>
                                          </ListItemAvatar>
                                          <ListItemText
                                            primary={`${member.first_name} ${member.last_name}`}
                                            secondary={member.email}
                                          />
                                          <ListItemSecondaryAction>
                                            <TeamRoleBadge role={member.teamRole} />
                                          </ListItemSecondaryAction>
                                        </ListItem>
                                      ))}
                                    </List>
                                    {hasMoreMembers && (
                                      <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Button 
                                          size="small" 
                                          onClick={loadMoreMembers}
                                          disabled={searchLoading}
                                        >
                                          Load More
                                        </Button>
                                      </Box>
                                    )}
                                  </>
                                )}
                              </Paper>
                            </Popper>
                          </ClickAwayListener>
                        </Box>
                        
                        <FormControl sx={{ minWidth: isMobile ? '100%' : 140 }}>
                          <Select
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value as number | 'all')}
                            sx={{ borderRadius: 2 }}
                            renderValue={(value) => (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FilterIcon fontSize="small" />
                                <Typography variant="body2">
                                  {value === 'all' ? 'All Roles' : 
                                   value === 1 ? 'Owners' :
                                   value === 2 ? 'Admins' :
                                   value === 3 ? 'Members' : 'Guests'}
                                </Typography>
                              </Box>
                            )}
                          >
                            <MenuItem value="all">All Roles</MenuItem>
                            <MenuItem value={1}>Owners</MenuItem>
                            <MenuItem value={2}>Admins</MenuItem>
                            <MenuItem value={3}>Members</MenuItem>
                            <MenuItem value={4}>Guests</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Paper>

                    {!searchQuery && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                        Search for team members to add them to the project
                      </Typography>
                    )}
                  </Box>
                </>
              )}

              {/* Progress indicator */}
              <Box sx={{ mt: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(assignees.length / Math.max(totalMembers, 1)) * 100} 
                  sx={{ 
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                    }
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {assignees.length} of {totalMembers} team members selected
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight="600">
                    {Math.round((assignees.length / Math.max(totalMembers, 1)) * 100)}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        gap: 2,
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}>
        <Button 
          onClick={handleClose}
          sx={{ 
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: '500',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': {
              backgroundColor: 'white',
              borderColor: 'text.secondary',
            }
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        
        {activeTab === 0 ? (
          <Button 
            onClick={() => setActiveTab(1)}
            variant="outlined"
            disabled={!projectData.team}
            endIcon={<ChevronRightIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: '600',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.50',
                borderColor: 'primary.dark',
              }
            }}
          >
            Continue to Team
          </Button>
        ) : (
          <Button 
            onClick={() => setActiveTab(0)}
            variant="outlined"
            startIcon={<ChevronRightIcon sx={{ transform: 'rotate(180deg)' }} />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: '600',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.50',
                borderColor: 'primary.dark',
              }
            }}
          >
            Back to Details
          </Button>
        )}
        
        <Button 
          onClick={handleCreateProject} 
          variant="contained"
          disabled={!canCreateProject() || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <RocketIcon />}
          sx={{ 
            borderRadius: 2,
            px: 4,
            py: 1,
            textTransform: 'none',
            fontWeight: '700',
            fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
              boxShadow: '0 6px 16px rgba(79, 70, 229, 0.4)',
            },
            '&:disabled': {
              background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              boxShadow: 'none',
            }
          }}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProjectDialog;