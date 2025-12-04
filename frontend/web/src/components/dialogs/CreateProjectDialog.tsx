// src/components/dialogs/CreateProjectDialog.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AvatarGroup,
  Badge,
  LinearProgress,
  Grow,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  Close as CloseIcon,
  Groups as TeamsIcon,
  Rocket as RocketIcon,
  Groups as GroupsIcon,
  PersonRemove as PersonRemoveIcon,
  Star as StarIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  HowToReg as ContributorIcon,
  ChevronRight as ChevronRightIcon,
  Workspaces as WorkspacesIcon,
  EmojiPeople as EmojiPeopleIcon,
  Diversity3 as Diversity3Icon,
} from '@mui/icons-material';
import { projectAPI } from '../../shared/services/projectAPI';
import { teamAPI } from '../../shared/services/teamAPI';
import { useSelector } from 'react-redux';
import { RootState } from '../../shared/store/store';
// Import your separate component
import TeamMemberSearch, { TeamMemberResult } from '../common/TeamMemberSearch'; 

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
  last_active?: string;
}

interface TeamMemberUser extends User {
  teamRole: number;
  last_active?: string;
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

// Helper component for consistent rendering
const AssigneeRow = ({ 
  assignee, 
  currentUserId, 
  onRoleChange, 
  onRemove, 
  formatLastActive, 
  isUserOnline 
}: any) => {
  const isMe = assignee.user.id === currentUserId;

  return (
    <Grow in={true} timeout={300}> 
      <Paper 
        sx={{ 
          p: 2, 
          borderRadius: 2, 
          backgroundColor: 'white', 
          border: '1px solid', 
          borderColor: isMe ? 'primary.main' : 'divider', 
          boxShadow: isMe ? '0 2px 8px rgba(79, 70, 229, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-1px)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar 
                src={assignee.user.avatar || undefined} 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  border: isMe ? '2px solid #4f46e5' : 'none' 
                }}
              >
                {assignee.user.first_name?.[0]}{assignee.user.last_name?.[0]}
              </Avatar>
              {assignee.user.last_active && isUserOnline(assignee.user.last_active) && (
                <Box sx={{ 
                  position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, 
                  backgroundColor: '#10B981', border: '2px solid white', borderRadius: '50%', 
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)', zIndex: 2 
                }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="600">
                  {assignee.user.first_name} {assignee.user.last_name}
                </Typography>
                {isMe && (
                  <Chip label="You" size="small" sx={{ backgroundColor: 'primary.50', color: 'primary.main', fontWeight: 500, height: 20 }} />
                )}
                {assignee.isLead && (
                  <Tooltip title="Project Lead"><StarIcon sx={{ color: 'warning.main', fontSize: 18 }} /></Tooltip>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">{assignee.user.email}</Typography>
              {assignee.user.last_active && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {isUserOnline(assignee.user.last_active) ? (
                    <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>Online</Box>
                  ) : (
                    `Last active: ${formatLastActive(assignee.user.last_active)}`
                  )}
                </Typography>
              )}
            </Box>
          </Box>
           
          {/* Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={assignee.role}
                onChange={(e) => onRoleChange(assignee.user.id, e.target.value)}
                sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                renderValue={(value) => {
                  const role = ASSIGNEE_ROLES.find(r => r.value === value);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {role?.icon}
                      <Typography variant="body2" fontWeight="500">{role?.label}</Typography>
                    </Box>
                  );
                }}
              >
                {ASSIGNEE_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `${role.badgeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {role.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight="500">{role.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{role.description}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Tooltip title="Remove member">
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => onRemove(assignee.user.id)}
                  disabled={false}
                  sx={{ 
                    color: 'error.main', 
                    bgcolor: 'error.50', 
                    '&:hover': { backgroundColor: 'error.100' } 
                  }}
                >
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
    </Grow>
  );
};

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
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);

  // User role and permission state
  const [userRole, setUserRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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

  // Permission checks
  const canEditProject = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER';
  const canAddAssignees = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER';

  // Get selected team for display
  const selectedTeam = useMemo(() => {
    return teams.find(team => team.id === projectData.team);
  }, [teams, projectData.team]);

  // Format last active function
  const formatLastActive = (lastActive?: string): string => {
    if (!lastActive || lastActive === 'null' || lastActive === 'undefined' || lastActive === '') {
      return 'Never';
    }
    
    try {
      let date: Date;
      const parsedDate = new Date(lastActive);
      
      if (isNaN(parsedDate.getTime())) {
        const timestamp = parseInt(lastActive, 10);
        if (!isNaN(timestamp)) {
          date = new Date(timestamp);
        } else {
          const cleaned = lastActive
            .replace('Z', '')
            .replace('+00:00', '')
            .replace('T', ' ')
            .trim();
          date = new Date(cleaned);
        }
        
        if (isNaN(date.getTime())) {
          return 'Never';
        }
      } else {
        date = parsedDate;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 1000 / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 5) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  const isUserOnline = (lastActive?: string): boolean => {
    if (!lastActive) return false;
    
    try {
      const date = new Date(lastActive);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
      return diffMins < 5;
    } catch {
      return false;
    }
  };

const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      const response = await teamAPI.getTeams();
      const teamsData: Team[] = response.data;
      setTeams(teamsData);
      
      if (teamId && teamsData.length > 0) {
        const targetTeam = teamsData.find(team => team.id === teamId);
        if (targetTeam) {
          setProjectData(prev => ({ ...prev, team: teamId }));
          
          if (user) {
            const currentUser: User = {
              id: user.id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              avatar: user.avatar,
              last_active: (user as any).last_active || new Date().toISOString() 
            };
            
            setAssignees([{
              id: user.id,
              user: currentUser,
              role: 3, // Lead
              isLead: true
            }]);
          }
          
          // Load member count and permissions
          try {
            const membersResponse = await teamAPI.getTeamMembersOptimized(teamId, 1, 1);
            setTotalMembers(membersResponse.data.total || 0);

            const userMember = membersResponse.data.results?.find((m: any) => 
                (m.user?.id === user?.id) || (m.id === user?.id)
            );
            
            if (userMember) {
                const roleMap: Record<number, any> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER', 4: 'GUEST' };
                setUserRole(roleMap[userMember.role] || 'GUEST');
            } else {
                setUserRole('MEMBER'); 
            }

          } catch (error) {
            console.error(error);
            setUserRole('MEMBER');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setError('Failed to load teams.');
    } finally {
      setTeamsLoading(false);
    }
  }, [teamId, user]);

  // Initialize when dialog opens
  useEffect(() => {
    if (open) {
      loadTeams();
      setAssignees([]);
      setActiveTab(0);
      setError(null);
      setPermissionError(null);
    }
  }, [open, loadTeams]);

  // Auto-add creator as lead when team is selected is handled in loadTeams or handleTeamChange for main user
  // (Search related effects removed)

const handleTeamChange = async (newTeamId: string) => {
    setProjectData(prev => ({ ...prev, team: newTeamId }));
    
    if (user) {
      const currentUser: User = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        last_active: (user as any).last_active || new Date().toISOString() 
      };
      
      setAssignees([{
        id: user.id,
        user: currentUser,
        role: 3, // Lead
        isLead: true
      }]);
    } else {
      setAssignees([]);
    }

    // Load new team data
    try {
      const membersResponse = await teamAPI.getTeamMembersOptimized(newTeamId, 1, 1);
      setTotalMembers(membersResponse.data.total || 0);
      
      // Check permissions for the new team
      const userMember = membersResponse.data.results?.find((m: any) => 
        (m.user?.id === user?.id) || (m.id === user?.id)
      );
      
      if (userMember) {
        const roleMap: Record<number, any> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER', 4: 'GUEST' };
        setUserRole(roleMap[userMember.role] || 'GUEST');
      } else {
        setUserRole('GUEST'); 
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
      setTotalMembers(0);
      setUserRole('GUEST');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAssignee = (member: TeamMemberResult | TeamMemberUser, role: number = 1) => {
    // Check permissions
    if (!canAddAssignees) {
      setError('You do not have permission to add assignees');
      return;
    }

    // Check if already added
    if (assignees.some(assignee => assignee.user.id === member.id)) {
      return;
    }

    const userData: User = {
      id: member.id,
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      avatar: member.avatar,
      last_active: member.last_active,
    };

    const newAssignee: Assignee = {
      id: member.id,
      user: userData,
      role,
      isLead: role === 3
    };
     
    setIsAnimating(true);
    setAssignees(prev => [...prev, newAssignee]);
    // Search state resets removed as they are internal to the new component now
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleRemoveAssignee = (userId: string) => {
      // 1. Prevent empty list
      if (assignees.length <= 1) {
        setError('A project must have at least one member.');
        return;
      }
      
      // 2. Check Role constraints for self-removal
      if (userId === user?.id) {
        const isPrivileged = userRole === 'OWNER' || userRole === 'ADMIN';
        if (!isPrivileged) {
            // If not privileged, you cannot remove yourself
            return;
        }
      }
      
      setIsAnimating(true);
      setAssignees(prev => prev.filter(a => a.user.id !== userId));
      setTimeout(() => setIsAnimating(false), 300);
    };

  const handleUpdateAssigneeRole = (userId: string, newRole: number) => {
    if (!canAddAssignees) {
      setError('You do not have permission to update assignee roles');
      return;
    }
     
    setAssignees(prev => 
      prev.map(assignee => 
        assignee.user.id === userId 
          ? { ...assignee, role: newRole, isLead: newRole === 3 }
          : assignee
      )
    );
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

      // Always include creator as lead if they're not already added
      if (user && !assignees.some(a => a.user.id === user.id)) {
        assigneeData.assignee_ids.push(user.id);
        assigneeData.assignee_roles.push(3);
      }

      // Add other assignees
      assignees.forEach(assignee => {
        assigneeData.assignee_ids.push(assignee.user.id);
        assigneeData.assignee_roles.push(assignee.role);
      });

      const formattedData = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        start_date: new Date(projectData.start_date).toISOString(),
        end_date: new Date(projectData.end_date).toISOString(),
        status: projectData.status,
        team: projectData.team,
        ...assigneeData
      };

    const response = await projectAPI.createProjectOptimized(projectData.team, formattedData);

      if (onProjectCreated) {
        const createdProject = response.data.project || response.data;
        onProjectCreated(createdProject);
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
    // 1. Close the dialog visually first
    onClose();

    // 2. Wait for the exit animation (300ms) before resetting state
    setTimeout(() => {
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
      setIsAnimating(false);
      setUserRole(null);
    }, 300); 
  };

  // User role display name
  const userRoleName = userRole === 'OWNER' ? 'Owner' : 
                       userRole === 'ADMIN' ? 'Admin' : 
                       userRole === 'MEMBER' ? 'Member' : 'Guest';

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
                  {userRole ? `Your role: ${userRoleName}` : `${totalMembers} members`}
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

      {/* Permission Alert */}
      {userRole === 'GUEST' && (
        <Alert 
          severity="warning" 
          sx={{ 
            mx: 3, 
            mt: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
          }}
          onClose={() => setPermissionError(null)}
        >
          <Typography variant="body2">
            You have <strong>Guest</strong> permissions and cannot create projects. Please contact a team admin.
          </Typography>
        </Alert>
      )}

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
            onChange={(e, newValue) => {
              setActiveTab(newValue);
            }}
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
              disabled={!canEditProject}
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
              disabled={!projectData.team || !canAddAssignees}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 4 }}>
          {activeTab === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Team Selection */}
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
                              {team?.name || 'Select Team'}
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

              {/* Project Name */}
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
                disabled={!canEditProject || !projectData.team}
                autoFocus
              />

              {/* Project Description */}
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
                disabled={!canEditProject || !projectData.team}
              />

              {/* Date Fields */}
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
                  disabled={!canEditProject || !projectData.team}
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
                  disabled={!canEditProject || !projectData.team}
                />
              </Box>

              {/* Status Selection */}
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
                  disabled={!canEditProject || !projectData.team}
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
            /* Team Members Tab */
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
                    {canAddAssignees 
                      ? 'Add team members and assign their roles'
                      : 'Add team members to the project'}
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

              {/* Selected Members */}
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
                    {assignees.map((assignee) => (
                      <AssigneeRow
                        key={assignee.user.id}
                        assignee={assignee}
                        currentUserId={user?.id}
                        onRoleChange={handleUpdateAssigneeRole}
                        onRemove={handleRemoveAssignee}
                        formatLastActive={formatLastActive}
                        isUserOnline={isUserOnline}
                      />
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
                        <TeamMemberSearch
                            teamId={projectData.team}
                            disabled={!projectData.team}
                            excludeIds={assignees.map(a => a.user.id)}
                            onSelect={(member) => handleAddAssignee(member)}
                            placeholder="Search team members to add..."
                        />
                    </Paper>

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
        
        {/* Tab Navigation */}
        {activeTab === 0 ? (
          <Button 
            onClick={() => setActiveTab(1)}
            variant="outlined"
            disabled={!projectData.team || !canAddAssignees}
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
        
        {/* Create Button */}
        <Button 
          onClick={handleCreateProject} 
          variant="contained"
          disabled={!projectData.team || !projectData.name.trim() || loading || !canEditProject}
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
              background: '#e2e8f0',
              color: '#94a3b8',
              boxShadow: 'none',
              cursor: 'not-allowed'
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