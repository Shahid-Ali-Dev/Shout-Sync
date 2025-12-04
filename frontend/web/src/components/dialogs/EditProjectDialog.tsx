// src/components/dialogs/EditProjectDialog.tsx
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
  Grow,
  AvatarGroup,
  Badge,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  Close as CloseIcon,
  Groups as TeamsIcon,
  Edit as EditIcon,
  PersonRemove as PersonRemoveIcon,
  Star as StarIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  HowToReg as ContributorIcon,
  Group as GroupsIcon,
  ChevronRight as ChevronRightIcon,
  Workspaces as WorkspacesIcon,
  EmojiPeople as EmojiPeopleIcon,
  Diversity3 as Diversity3Icon,
  CheckCircle as CheckCircleIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon,
  Lightbulb as PlanningIcon,
  TransferWithinAStation as TransferIcon,
} from '@mui/icons-material';
import { projectAPI } from '../../shared/services/projectAPI';
import { teamAPI } from '../../shared/services/teamAPI';
import { useSelector } from 'react-redux';
import { RootState } from '../../shared/store/store';
// Import your separate component
import TeamMemberSearch, { TeamMemberResult } from '../common/TeamMemberSearch';

interface EditProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onProjectUpdated?: (project: any) => void;
  project: any;
  teamId?: string;
  teams?: Array<{ id: string; name: string; member_count: number }>;
}

interface AssigneeItemProps {
  assignee: Assignee;
  currentUserId?: string;
  projectCreatorId?: string;
  isTeamAdmin: boolean;
  userRole: string;
  canEditAssignees: boolean;
  canRemove: boolean;
  canEditRole: boolean;
  myRank: number;
  index: number;
  disableAnimation: boolean;
  onRoleChange: (userId: string, role: number) => void;
  onRemove: (userId: string) => void;
  formatLastActive: (date?: string) => string;
  isUserOnline: (date?: string) => boolean;
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
  joined_at?: string;
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

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onClose,
  onProjectUpdated,
  project,
  teamId,
  teams = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Assignee State
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [originalAssignees, setOriginalAssignees] = useState<Assignee[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [listAnimationComplete, setListAnimationComplete] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0); // Kept for progress bar logic

  // Role State
  const [userRole, setUserRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Initialize projectData
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 1,
    team_id: '',
  });

   // Permission checks
  // 1. Determine current user's role within this specific project
    const currentUserAssignee = useMemo(() => 
      assignees.find(a => a.user.id === user?.id), 
      [assignees, user?.id]
    );

    const projectRole = currentUserAssignee?.role || 0; 
    const isProjectLead = projectRole === 3;
    const isProjectManager = projectRole === 2;
    const isAssigned = projectRole > 0;
    const isTeamAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

    // 2. Define Permissions
    const canEditProject = isTeamAdmin || userRole === 'MEMBER' || isAssigned;
    const canEditProjectDetails = isTeamAdmin || isAssigned;
    const canTransferProject = isTeamAdmin;
    const canEditAssignees = isTeamAdmin || isProjectLead || isProjectManager;
    const canAddAssignees = isTeamAdmin || isProjectLead || isProjectManager;

  // Get current team from project
  const currentTeam = useMemo(() => {
    const projectTeamId = typeof project?.team === 'object' ? project.team.id : project?.team;
    const targetTeamId = projectTeamId || teamId;
    
    if (targetTeamId && availableTeams.length > 0) {
      const foundTeam = availableTeams.find(team => team.id === targetTeamId);
      if (foundTeam) return foundTeam;
    }
    
    if (project?.team && typeof project.team === 'object') {
      return {
        id: project.team.id || targetTeamId,
        name: project.team.name || 'Team',
        description: project.team.description,
        member_count: project.team.member_count || 0
      };
    }
    
    return {
      id: targetTeamId || '',
      name: 'Team',
      description: '',
      member_count: 0
    };
  }, [project, teamId, availableTeams]);

    // 1. Calculate My Rank
    const myRank = useMemo(() => {
      if (userRole === 'OWNER' || userRole === 'ADMIN') return 4; // Superuser
      return currentUserAssignee?.role || 0; // 3=Lead, 2=Manager, 1=Contributor
    }, [userRole, currentUserAssignee]);

    // 2. Helper to check if I can manage a specific target user
    const canManageTargetUser = (targetUserId: string, targetRole: number) => {
      if (targetUserId === user?.id) return false;
      if (targetUserId === project?.created_by?.id && userRole !== 'OWNER') return false;
      return myRank > targetRole;
    };

  // Helper Functions
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
          const cleaned = lastActive.replace('Z', '').replace('+00:00', '').replace('T', ' ').trim();
          date = new Date(cleaned);
        }
        
        if (isNaN(date.getTime())) return 'Never';
      } else {
        date = parsedDate;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 5) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      
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
      return (now.getTime() - date.getTime()) < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  // Optimized loadTeams (Removed manual member search list logic)
  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      
      const projectTeamId = typeof project?.team === 'object' ? project.team.id : project?.team;
      const targetTeamId = projectTeamId || teamId;

      // 1. Fetch Teams
      const teamsPromise = teams.length > 0 
        ? Promise.resolve({ data: teams }) 
        : teamAPI.getTeams();

      // 2. Fetch minimal members data for Role Check and Total Count
      const membersPromise = targetTeamId
        ? teamAPI.getTeamMembersOptimized(targetTeamId, 1, 1)
        : Promise.resolve({ data: { results: [], total: 0 } });

      const [teamsRes, membersRes] = await Promise.all([
        teamsPromise,
        membersPromise,
      ]);

      setAvailableTeams(teamsRes.data);

      // Set Total Members count for progress bar
      if (membersRes.data) {
        setTotalMembers(membersRes.data.total || 0);
        
        // Determine Role
        if (membersRes.data.results) {
            // Note: optimized endpoint usually returns list, we might need a specific check if not in first page
            // But for efficiency we assume user context or separate perm check. 
            // Better to use the full list or a 'me' endpoint if available, falling back to what we have.
            const userMember = membersRes.data.results.find((m: any) => 
                (m.user?.id === user?.id) || (m.id === user?.id)
            );
            
            if (userMember) {
                const roleMap: Record<number, any> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER', 4: 'GUEST' };
                setUserRole(roleMap[userMember.role] || 'GUEST');
            } else {
                // Fallback / Default
                setUserRole('GUEST'); 
            }
        }
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load project data.');
    } finally {
      setTeamsLoading(false);
    }
  }, [teams, project?.team?.id, teamId, user]);
  
  // Initialize data when dialog opens
  useEffect(() => {
    if (open && project) {
      loadTeams();
      
      const projectTeamId = typeof project.team === 'object' ? project.team.id : project.team;

      setProjectData({
        name: project.name || '',
        description: project.description || '',
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
        status: project.status || 1,
        team_id: projectTeamId || teamId || '', 
      });

      const initialAssignees: Assignee[] = (project.assignees || []).map((assignee: any) => ({
        id: assignee.id || assignee.user?.id,
        user: assignee.user_details || assignee.user,
        role: assignee.role || 1,
        isLead: assignee.is_lead || assignee.role === 3,
      }));
      
      setAssignees(initialAssignees);
      setOriginalAssignees(initialAssignees);
      setError(null);
      setSuccessMessage(null);
      setPermissionError(null);
    }
  }, [open, project, teamId, loadTeams]);

  // Animation delay effect
    useEffect(() => {
      if (activeTab === 1) { 
        const timer = setTimeout(() => {
          setListAnimationComplete(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }, [activeTab]);

  // Check permissions when dialog opens
    useEffect(() => {
      const isUserAssigned = project?.assignees?.some((a: any) => 
        (a.user?.id === user?.id) || (a.id === user?.id)
      );

      if (open && project && userRole === 'GUEST' && !isUserAssigned) {
        setPermissionError('You have Guest permissions and cannot edit projects. Please contact a team admin.');
      } else {
        setPermissionError(null);
      }
    }, [open, project, userRole, user?.id]);

  const handleTeamChange = async (teamId: string) => {
    setProjectData(prev => ({ ...prev, team_id: teamId }));
    setAssignees([]);
    
    // Load team member count for the new team
    try {
      const membersResponse = await teamAPI.getTeamMembersOptimized(teamId, 1, 1);
      setTotalMembers(membersResponse.data.total || 0);
    } catch (error) {
      console.error('Failed to load team members count:', error);
      setTotalMembers(0);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!canEditProjectDetails && ['name', 'description', 'start_date', 'end_date', 'status', 'team_id'].includes(field)) {
      setError('You do not have permission to edit project details');
      return;
    }
    
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAssignee = (member: TeamMemberResult | TeamMemberUser, role: number = 1) => {
    if (!canAddAssignees) {
      setError('You do not have permission to add assignees');
      return;
    }

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
    
    setTimeout(() => setIsAnimating(false), 300);
  };

const handleRemoveAssignee = (userId: string) => {
    if (assignees.length === 1 && assignees[0].user.id === userId) {
      setError('A project must have at least one member.');
      return;
    }
    
    if (!canAddAssignees) {
      setError('You do not have permission to remove assignees');
      return;
    }
    
    setIsAnimating(true);
    setAssignees(prev => prev.filter(assignee => assignee.user.id !== userId));
    
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

// Memoized component for rows
const AssigneeRow = React.memo(({ 
  assignee, index, disableAnimation, 
  currentUserId, projectCreatorId, isTeamAdmin, userRole, 
  canEditAssignees, canRemove, canEditRole, myRank, 
  onRoleChange, onRemove, formatLastActive, isUserOnline 
}: AssigneeItemProps) => {
  const isMe = assignee.user.id === currentUserId;
  const isProjectCreator = assignee.user.id === projectCreatorId;

  return (
    <Grow 
      in={true} 
      timeout={disableAnimation ? 0 : 300}
    >
      <Paper sx={{ p: 2, borderRadius: 2, backgroundColor: 'white', border: '1px solid', borderColor: isMe ? 'primary.main' : 'divider', boxShadow: isMe ? '0 2px 8px rgba(79, 70, 229, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.08)', transition: 'all 0.3s ease', '&:hover': { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)', transform: 'translateY(-1px)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar src={assignee.user.avatar || undefined} sx={{ width: 48, height: 48, border: isMe ? '2px solid #4f46e5' : 'none' }}>
                {assignee.user.first_name?.[0]}{assignee.user.last_name?.[0]}
              </Avatar>
              {assignee.user.last_active && isUserOnline(assignee.user.last_active) && (
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, backgroundColor: '#10B981', border: '2px solid white', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)', zIndex: 2 }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="600">
                  {assignee.user.first_name} {assignee.user.last_name}
                </Typography>
                {isMe && <Chip label="You" size="small" sx={{ backgroundColor: 'primary.50', color: 'primary.main', fontWeight: 500, height: 20 }} />}
                {isProjectCreator && <Chip label="Creator" size="small" sx={{ backgroundColor: 'warning.50', color: 'warning.main', fontWeight: 500, height: 20 }} />}
                {assignee.isLead && <Tooltip title="Project Lead"><StarIcon sx={{ color: 'warning.main', fontSize: 18 }} /></Tooltip>}
              </Box>
              <Typography variant="caption" color="text.secondary">{assignee.user.email}</Typography>
              {assignee.user.last_active && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {isUserOnline(assignee.user.last_active) ? <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>Online</Box> : `Last active: ${formatLastActive(assignee.user.last_active)}`}
                </Typography>
              )}
            </Box>
          </Box>
           
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={assignee.role}
                onChange={(e) => onRoleChange(assignee.user.id, e.target.value as number)}
                disabled={!canEditAssignees || !canEditRole}
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
                {ASSIGNEE_ROLES.map((role) => {
                  const isRoleTooHigh = role.value > myRank;
                  return (
                    <MenuItem key={role.value} value={role.value} disabled={isRoleTooHigh}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5, opacity: isRoleTooHigh ? 0.5 : 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `${role.badgeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {role.icon}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="500">{role.label}</Typography>
                          {isRoleTooHigh ? <Typography variant="caption" color="error" sx={{fontSize: '0.65rem'}}>(Requires higher role)</Typography> : <Typography variant="caption" color="text.secondary">{role.description}</Typography>}
                        </Box>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            {canEditAssignees && canRemove && (
              <Tooltip title={isMe ? "Remove myself" : "Remove member"}>
                <IconButton size="small" onClick={() => onRemove(assignee.user.id)} sx={{ color: 'error.main', backgroundColor: 'error.50', '&:hover': { backgroundColor: 'error.100' } }}>
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>
    </Grow>
  );
});

  // Get user role display name
  const userRoleName = userRole === 'OWNER' ? 'Owner' : 
                       userRole === 'ADMIN' ? 'Admin' : 
                       userRole === 'MEMBER' ? 'Member' : 'Guest';

  const validateForm = (): boolean => {
    if (!projectData.name.trim()) {
      setError('Project name is required');
      return false;
    }
    if (!projectData.team_id) {
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

const handleUpdateProject = async () => {
    if (!canEditProject) {
      setError('You do not have permission to update projects...');
      return;
    }
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const formattedData: any = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        start_date: new Date(projectData.start_date).toISOString(),
        end_date: new Date(projectData.end_date).toISOString(),
        status: projectData.status,
        team: projectData.team_id,
      };

      if (canEditAssignees) {
        const assigneeData = {
          assignee_ids: [] as string[],
          assignee_roles: [] as number[],
        };

          assignees.forEach(assignee => {
          assigneeData.assignee_ids.push(assignee.user.id);
          assigneeData.assignee_roles.push(assignee.role);
        });

        formattedData.assignee_ids = assigneeData.assignee_ids;
        formattedData.assignee_roles = assigneeData.assignee_roles;
      }

      const isTeamChanged = projectData.team_id !== (project.team?.id || teamId);
      
      if (isTeamChanged && canTransferProject) {
        const confirmTransfer = window.confirm(
          `Are you sure you want to transfer this project to the new team? This will:\n\n` +
          `• Notify all team members\n` +
          `• Remove members not in the new team\n` +
          `• Update all project references`
        );
        
        if (!confirmTransfer) {
          setSaving(false);
          return;
        }

        await projectAPI.transferProject(
          project.team?.id || teamId,
          project.id,
          { target_team_id: projectData.team_id }
        );

        const updateResponse = await projectAPI.updateProject(
          projectData.team_id,
          project.id,
          formattedData
        );

        if (onProjectUpdated) {
          onProjectUpdated({
            ...updateResponse.data,
            is_transferred: true,
          });
        }

        setSuccessMessage('✅ Project transferred and updated successfully!');
      } else {
        const response = await projectAPI.updateProject(
          projectData.team_id,
          project.id,
          formattedData
        );

        if (onProjectUpdated) {
          onProjectUpdated(response.data);
        }

        setSuccessMessage('✅ Project updated successfully!');
      }
      
      setTimeout(() => {
        handleClose();
        if (onProjectUpdated) {
          onProjectUpdated({ refresh: true });
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Project update failed:', error);
      
      let message = 'Failed to update project';
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response?.status === 403) {
        message = 'You do not have permission to update projects. Please contact your team admin.';
      }
      
      setError(message);
    } finally {
      setSaving(false);
    }
  };

const handleClose = () => {
    onClose();

    setTimeout(() => {
      setProjectData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 1,
        team_id: '',
      });
      setAssignees([]);
      setError(null);
      setSuccessMessage(null);
      setPermissionError(null);
      setActiveTab(0);
      setIsAnimating(false);
      setUserRole(null); 
    }, 300);
  };

  const TeamRoleBadge = ({ role }: { role: number }) => {
    const roleNames: Record<number, string> = { 1: 'Owner', 2: 'Admin', 3: 'Member', 4: 'Guest' };
    const colors: Record<number, string> = { 1: '#EF4444', 2: '#3B82F6', 3: '#10B981', 4: '#6B7280' };
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

  const hasChanges = useMemo(() => {
    const dataChanged = 
      projectData.name !== project?.name ||
      projectData.description !== project?.description ||
      projectData.status !== project?.status ||
      projectData.team_id !== (project?.team?.id || teamId) ||
      projectData.start_date !== (project?.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '') ||
      projectData.end_date !== (project?.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '');

    const assigneesChanged = JSON.stringify(assignees) !== JSON.stringify(originalAssignees);
    
    return dataChanged || assigneesChanged;
  }, [projectData, project, teamId, assignees, originalAssignees]);

  if (loading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm">
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Loading project data...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

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
            <EditIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="800">
              Edit Project
            </Typography>
            
            {teamsLoading || userRole === null ? (
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="circular" width={4} height={4} />
                <Skeleton variant="text" width={120} height={20} />
              </Box>
            ) : (
              currentTeam && (
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <WorkspacesIcon sx={{ fontSize: 12 }} />
                    {currentTeam.name}
                  </Box>
                  {' • '}
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <EmojiPeopleIcon sx={{ fontSize: 12 }} />
                    Your role: {isAssigned 
                      ? `${ASSIGNEE_ROLES.find(r => r.value === projectRole)?.label} (Project)` 
                      : `${userRole === 'OWNER' ? 'Owner' : userRole === 'ADMIN' ? 'Admin' : userRole === 'MEMBER' ? 'Member' : 'Guest'} (Team)`}
                  </Box>
                </Typography>
              )
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

      {!teamsLoading && userRole !== null && permissionError && (
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
            You have <strong>{userRoleName}</strong> permissions. 
            {userRole === 'GUEST' 
              ? ' You can view project details but cannot make changes.'
              : userRole === 'MEMBER'
                ? ' You can edit basic project details but cannot manage team assignments.'
                : ' You have full editing permissions.'}
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

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ 
            mx: 3, 
            mt: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)',
          }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
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
            if (newValue === 1) {
              setListAnimationComplete(false); 
            }
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
              disabled={!projectData.team_id || teamsLoading || !canEditAssignees}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TransferIcon fontSize="small" />
                  Transfer
                </Box>
              }
              disabled={!canTransferProject}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 4 }}>
          {activeTab === 0 ? (
            /* Basic Info Tab */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Team Selection - Only show if user can transfer */}
              {canTransferProject && (teams.length > 1 || availableTeams.length > 1) && (
                <FormControl fullWidth>
                  <InputLabel>Team</InputLabel>
                  <Select
                    value={projectData.team_id}
                    label="Team"
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={teamsLoading || !canEditProjectDetails}
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
                      const team = availableTeams.find(t => t.id === value);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <TeamsIcon sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="600">
                              {team?.name || 'Select Team'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team?.member_count || 0} members
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  >
                    {availableTeams.map((team) => (
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
                          {team.id === (project?.team?.id || teamId) && (
                            <Chip 
                              label="Current" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Select the team this project belongs to
                  </FormHelperText>
                </FormControl>
              )}

              {/* Project Name */}
              <TextField
                label="Project Name"
                required
                fullWidth
                value={projectData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!canEditProjectDetails}
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
                disabled={!canEditProjectDetails}
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
                  disabled={!canEditProjectDetails}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4f46e5',
                        borderWidth: 2,
                      }
                    } 
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={projectData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  disabled={!canEditProjectDetails}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4f46e5',
                        borderWidth: 2,
                      }
                    } 
                  }}
                />
              </Box>

              {/* Status Selection */}
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={projectData.status}
                  label="Status"
                  onChange={(e) => handleInputChange('status', e.target.value as number)}
                  disabled={!canEditProjectDetails}
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
                  Set the project status
                </FormHelperText>
              </FormControl>
            </Box>
          ) : activeTab === 1 ? (
            /* Assignees Tab */
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
                    {canEditAssignees 
                      ? 'Add team members and assign their roles'
                      : 'View team members assigned to this project'}
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
                      {canEditAssignees 
                        ? 'Start adding team members below to build your project team'
                        : 'No team members have been assigned to this project'}
                    </Typography>
                  </Box>
                ) : (
                <Stack spacing={2} key={`assignees-list-${activeTab}`}> 
                  {assignees.map((assignee, index) => {
                    const isMe = assignee.user.id === user?.id;
                    const isProjectCreator = assignee.user.id === project?.created_by?.id;
                    
                    // Permission calcs
                    const canManageTarget = canManageTargetUser(assignee.user.id, assignee.role);
                    const canEditRole = isTeamAdmin 
                      ? (isMe || !isProjectCreator || userRole === 'OWNER')
                      : (!isMe && canManageTarget);
                    const canRemove = isTeamAdmin
                      ? (isMe || !isProjectCreator || userRole === 'OWNER')
                      : (!isMe && canManageTarget);

                    return (
                      <AssigneeRow
                        key={assignee.user.id}
                        index={index}
                        disableAnimation={listAnimationComplete}
                        assignee={assignee}
                        currentUserId={user?.id}
                        projectCreatorId={project?.created_by?.id}
                        isTeamAdmin={isTeamAdmin}
                        userRole={userRole || 'GUEST'}
                        canEditAssignees={canEditAssignees}
                        canRemove={canRemove}
                        canEditRole={canEditRole}
                        myRank={myRank}
                        onRoleChange={handleUpdateAssigneeRole}
                        onRemove={handleRemoveAssignee}
                        formatLastActive={formatLastActive}
                        isUserOnline={isUserOnline}
                      />
                    );
                  })}
                </Stack>
                )}
              </Paper>

              {canEditAssignees && (
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
                            teamId={projectData.team_id}
                            disabled={!projectData.team_id}
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
          ) : (
            /* Transfer Tab */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" fontWeight="700" gutterBottom>
                Transfer Project
              </Typography>
              
              <Alert 
                severity="warning" 
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'warning.light',
                }}
              >
                <Typography variant="body2">
                  <strong>⚠️ Important:</strong> Transferring a project to another team will:
                  <br />
                  • Send notifications to all members of both teams
                  <br />
                  • Remove project members who are not in the new team
                  <br />
                  • Update all project references to the new team
                  <br />
                  • Create activity logs for tracking
                </Typography>
              </Alert>

              <Paper sx={{ 
                p: 3, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <TransferIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="600">
                      Select Target Team
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Choose which team to transfer this project to
                    </Typography>
                  </Box>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Target Team</InputLabel>
                  <Select
                    value={projectData.team_id}
                    label="Target Team"
                    onChange={(e) => handleTeamChange(e.target.value)}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb',
                      },
                    }}
                    renderValue={(value) => {
                      const team = availableTeams.find(t => t.id === value);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <TeamsIcon sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="600">
                              {team?.name || 'Select Team'}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  >
                    {availableTeams
                      .filter(team => team.id !== (project?.team?.id || teamId))
                      .map((team) => (
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
                    Select the team you want to transfer this project to
                  </FormHelperText>
                </FormControl>
              </Paper>

              {projectData.team_id !== (project?.team?.id || teamId) && (
                <Alert 
                  severity="info"
                  sx={{ borderRadius: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Ready to transfer:</strong> This project will be moved from "{currentTeam?.name}" to "{availableTeams.find(t => t.id === projectData.team_id)?.name}".
                  </Typography>
                </Alert>
              )}
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
        
        {/* Tab Navigation Buttons */}
        {activeTab === 0 ? (
          <Button 
            onClick={() => setActiveTab(1)}
            variant="outlined"
            disabled={!projectData.team_id || !canEditAssignees}
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
        ) : activeTab === 1 ? (
          <>
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
            {canTransferProject && (
              <Button 
                onClick={() => setActiveTab(2)}
                variant="outlined"
                endIcon={<ChevronRightIcon />}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: '600',
                  borderColor: 'warning.main',
                  color: 'warning.main',
                  '&:hover': {
                    backgroundColor: 'warning.50',
                    borderColor: 'warning.dark',
                  }
                }}
              >
                Transfer Options
              </Button>
            )}
          </>
        ) : (
          <Button 
            onClick={() => setActiveTab(1)}
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
            Back to Members
          </Button>
        )}
        <Button
          onClick={handleUpdateProject}
          variant="contained"
          disabled={!hasChanges || saving || !canEditProject}
          startIcon={saving ? <CircularProgress size={16} /> : <EditIcon />}
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
          {saving ? 'Updating...' : 
          projectData.team_id !== (project?.team?.id || teamId) ? 'Transfer Project' : 'Update Project'}
        </Button>
      </DialogActions>
      
    </Dialog>
  );
};

export default EditProjectDialog;