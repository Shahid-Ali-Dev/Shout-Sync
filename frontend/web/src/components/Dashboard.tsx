// src/components/Dashboard.tsx - FIXED VERSION
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fab,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Paper,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Groups as TeamsIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  PlayArrow as InProgressIcon,
  Person as PersonIcon,
  GroupAdd as GroupAddIcon,
  Dashboard as DashboardIcon,
  ViewKanban as KanbanIcon,
  FilterList as FilterIcon,
  ViewList as ListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  Clear as ClearIcon,
  FilterList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { activityAPI } from '../shared/services/activityAPI';
import { RootState, AppDispatch } from '../shared/store/store';
import { teamAPI } from '../shared/services/teamAPI';
import { analyticsAPI } from '../shared/services/analyticsAPI'
import { projectAPI } from '../shared/services/projectAPI';
import { taskAPI } from '../shared/services/taskAPI';
import QuickActionsMenu from './QuickActionsMenu';
import CommonHeader from './CommonHeader';
import JoinTeamDialog from './JoinTeamDialog';
import CreateProjectDialog from './dialogs/CreateProjectDialog';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_by_name: string;
  project_count?: number;
  members?: any[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: number;
  progress: number;
  team_name: string;
  member_count: number;
  task_count: number;
  due_date?: string;
  team_members?: any[];
  team_id?: string;
}

interface Task {
  id: string;
  title: string;
  project_name: string;
  status: number;
  priority: number;
  due_date?: string;
  assignee?: any;
  project_id?: string;
  team_id?: string;
}

// Search types
type SearchCategory = 'all' | 'teams' | 'projects' | 'tasks';
type SearchResult = {
  type: 'team' | 'project' | 'task';
  data: Team | Project | Task;
  relevance: number;
};

// FIXED: HeaderContent moved OUTSIDE the Dashboard component
const HeaderContent = React.memo(({ 
  searchQuery, 
  onSearchChange, 
  onSearchClear, 
  onRefresh, 
  refreshing,
  isSearchExpanded,
  onToggleSearch,
  isMobile 
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  isSearchExpanded: boolean;
  onToggleSearch: () => void;
  isMobile: boolean;
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  

  // Focus management for mobile
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleSearchClear = () => {
    onSearchClear();
    if (!isMobile) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    }
  };

  const handleMobileSearchToggle = () => {
    onToggleSearch();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: 2,
      width: '100%',
      justifyContent: 'space-between'
    }}>
      {/* Search Section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        flex: isMobile ? '0 1 auto' : 1,
        maxWidth: isMobile ? '100%' : 400,
        minHeight: 40
      }}>
        {/* Desktop: Always show search field */}
        {!isMobile && (
          <TextField
            inputRef={searchInputRef}
            placeholder="Search teams, projects, tasks..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'white',
                height: 40,
                fontSize: '0.9rem',
              },
              '& .MuiInputBase-input': {
                py: 1,
                fontSize: '0.9rem',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 1 }}>
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={handleSearchClear}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Mobile: Collapsible search */}
        {isMobile && (
          <>
            {/* Search Icon Button - Always visible on mobile */}
            <Tooltip title="Search">
              <IconButton
                onClick={handleMobileSearchToggle}
                sx={{
                  backgroundColor: isSearchExpanded ? 'primary.50' : 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    backgroundColor: isSearchExpanded ? 'primary.100' : 'grey.50',
                  }
                }}
              >
                {isSearchExpanded ? (
                  <ClearIcon fontSize="small" color="primary" />
                ) : (
                  <SearchIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Expandable Search Field for Mobile */}
            <Collapse 
              in={isSearchExpanded} 
              orientation="horizontal"
              sx={{ 
                flex: 1,
                minWidth: isSearchExpanded ? 200 : 0
              }}
              timeout="auto"
            >
              <TextField
                inputRef={searchInputRef}
                placeholder="Search teams, projects, tasks..."
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'white',
                    height: 40,
                    fontSize: '0.875rem',
                  },
                  '& .MuiInputBase-input': {
                    py: 1,
                    fontSize: '0.875rem',
                  }
                }}
                InputProps={{
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={handleSearchClear}
                        sx={{ p: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Collapse>
          </>
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Tooltip title="Refresh">
          <IconButton 
            onClick={onRefresh}
            disabled={refreshing}
            sx={{
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: 'grey.50',
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <QuickActionsMenu />
      </Box>
    </Box>
  );
});

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [dueTasks, setDueTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [productivityStats, setProductivityStats] = useState<any>(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    totalTeams: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedTasks: 0,
    overdueTasks: 0,
    teamMembers: 0,
    tasksDueToday: 0,
});
  
  // Dialog states
  const [joinTeamDialogOpen, setJoinTeamDialogOpen] = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [teamMenuAnchor, setTeamMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  // Load all dashboard data
const loadDashboardData = async () => {
    try {
      
      setLoading(true);
      
      // 1. Single API Call for everything
      const response = await analyticsAPI.getDashboardStats();
      setDashboardStats(response.data.stats); // Direct mapping
      const data = response.data;

      // 2. Set Stats
      // Map backend response to your frontend stats structure
      // (Ensure your backend returns exactly these keys or map them here)
      const backendStats = data.stats;
      
      // 3. Set Lists
      setTeams(data.all_teams); // Lightweight teams list for search
      setProjects(data.recent_projects); // Only top 5 recent projects
      setDueTasks(data.due_tasks);
      setRecentTasks(data.recent_tasks);
      
      // 4. Set Tasks for search (Optional: If you want full search, you might need a separate call
      // or accept that dashboard search only searches recent items now for speed)
      setAllTasks([...data.due_tasks, ...data.recent_tasks]); 

      // 5. Calculate derived stats if backend didn't provide them all
      // But ideally backend provides everything.
      
      // Note: We are NOT setting 'projects' to ALL projects anymore, 
      // just the recent ones. This makes it fast.
      // If you need "Total Projects" number for the card, use the stat from backend:
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load dashboard data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Define handleRefresh BEFORE useMemo
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  // FIXED: Memoized header content - NOW handleRefresh is defined
  const headerContent = useMemo(() => (
    <HeaderContent 
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchClear={() => {
        setSearchQuery('');
        setIsSearchActive(false);
        setIsSearchExpanded(false);
      }}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      isSearchExpanded={isSearchExpanded}
      onToggleSearch={() => setIsSearchExpanded(!isSearchExpanded)}
      isMobile={isMobile}
    />
  ), [searchQuery, isSearchExpanded, refreshing, isMobile, handleRefresh]);

  // Search functionality
  const performSearch = useMemo(() => {
    if (!searchQuery.trim()) {
      setIsSearchActive(false);
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search teams
    if (searchCategory === 'all' || searchCategory === 'teams') {
      teams.forEach(team => {
        let relevance = 0;
        
        // Name match (highest relevance)
        if (team.name.toLowerCase().includes(query)) {
          relevance += 100;
        }
        
        // Description match
        if (team.description?.toLowerCase().includes(query)) {
          relevance += 50;
        }
        
        if (relevance > 0) {
          results.push({
            type: 'team',
            data: team,
            relevance
          });
        }
      });
    }

    // Search projects
    if (searchCategory === 'all' || searchCategory === 'projects') {
      projects.forEach(project => {
        let relevance = 0;
        
        // Name match (highest relevance)
        if (project.name.toLowerCase().includes(query)) {
          relevance += 100;
        }
        
        // Description match
        if (project.description?.toLowerCase().includes(query)) {
          relevance += 50;
        }
        
        // Team name match
        if (project.team_name.toLowerCase().includes(query)) {
          relevance += 30;
        }
        
        if (relevance > 0) {
          results.push({
            type: 'project',
            data: project,
            relevance
          });
        }
      });
    }

    // Search tasks
    if (searchCategory === 'all' || searchCategory === 'tasks') {
      allTasks.forEach(task => {
        let relevance = 0;
        
        // Title match (highest relevance)
        if (task.title.toLowerCase().includes(query)) {
          relevance += 100;
        }
        
        // Project name match
        if (task.project_name.toLowerCase().includes(query)) {
          relevance += 30;
        }
        
        if (relevance > 0) {
          results.push({
            type: 'task',
            data: task,
            relevance
          });
        }
      });
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    setIsSearchActive(true);
    return results;
  }, [searchQuery, searchCategory, teams, projects, allTasks]);

  useEffect(() => {
    setSearchResults(performSearch);
  }, [performSearch]);

  const handleSearchCategoryChange = (event: React.SyntheticEvent, newValue: SearchCategory) => {
    setSearchCategory(newValue);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'team':
        const team = result.data as Team;
        navigate(`/team/${team.id}`);
        break;
      case 'project':
        const project = result.data as Project;
        if (project.team_id) {
          navigate(`/team/${project.team_id}/project/${project.id}`);
        }
        break;
      case 'task':
        const task = result.data as Task;
        if (task.team_id && task.project_id) {
          navigate(`/team/${task.team_id}/project/${task.project_id}/task/${task.id}`);
        }
        break;
    }
    handleSearchClear();
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    setIsSearchExpanded(false);
  };

  // Additional existing functions remain the same...
  const loadAdditionalData = async () => {
    try {
      const activitiesResponse = await activityAPI.getUserActivities(5);
      setRecentActivities(activitiesResponse.data);
      
      if (user?.id) {
        const productivityResponse = await analyticsAPI.getUserProductivity(user.id);
        setProductivityStats(productivityResponse.data);
      }
    } catch (error) {
      console.error('Failed to load additional data:', error);
    }
  };

  const getUniqueMemberCount = (teams: Team[]) => {
    const uniqueMembers = new Set();
    teams.forEach(team => {
      team.members?.forEach(member => {
        uniqueMembers.add(member.user.id);
      });
    });
    return uniqueMembers.size;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a team name',
        severity: 'warning'
      });
      return;
    }

    try {
      setCreatingTeam(true);
      await teamAPI.createTeam(newTeam);
      setCreateTeamDialogOpen(false);
      setNewTeam({ name: '', description: '' });
      setSnackbar({
        open: true,
        message: 'Team created successfully!',
        severity: 'success'
      });
      await loadDashboardData();
    } catch (error: any) {
      console.error('Failed to create team:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to create team',
        severity: 'error'
      });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateProject = (project: any) => {
    setSnackbar({
      open: true,
      message: 'Project created successfully!',
      severity: 'success'
    });
    setCreateProjectDialogOpen(false);
    loadDashboardData();
  };

  // Team menu handlers and other existing functions remain the same...
  const handleTeamMenuOpen = (event: React.MouseEvent<HTMLElement>, team: Team) => {
    event.stopPropagation();
    setTeamMenuAnchor(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleTeamMenuClose = () => {
    setTeamMenuAnchor(null);
    setSelectedTeam(null);
  };

  const handleInviteToTeam = () => {
    if (selectedTeam) {
      navigate(`/team/${selectedTeam.id}`);
    }
    handleTeamMenuClose();
  };

  const handleTeamSettings = () => {
    if (selectedTeam) {
      navigate(`/team/${selectedTeam.id}/settings`);
    }
    handleTeamMenuClose();
  };

  const handleViewTeam = () => {
    if (selectedTeam) {
      navigate(`/team/${selectedTeam.id}`);
    }
    handleTeamMenuClose();
  };

  const toggleShowAllTeams = () => {
    setShowAllTeams(!showAllTeams);
  };

  const getDisplayTeams = () => {
    if (isSearchActive && searchCategory !== 'tasks') {
      return searchResults
        .filter(result => result.type === 'team')
        .map(result => result.data as Team)
        .slice(0, isMobile ? 2 : 4);
    }
    
    let filteredTeams = teams;
    if (showAllTeams) {
      return filteredTeams;
    }
    return filteredTeams.slice(0, isMobile ? 2 : 4);
  };

  const getDisplayProjects = () => {
      // 1. If Searching: Show top results based on mobile/desktop limit
      if (isSearchActive && searchCategory !== 'teams') {
        return searchResults
          .filter(result => result.type === 'project')
          .map(result => result.data as Project)
          .slice(0, isMobile ? 2 : 4);
      }

      // 2. If Dashboard View: Show only the top 4 recent ones
      // This fixes your issue. We slice ONLY for display, keeping the full list in state.
      return projects.slice(0, isMobile ? 2 : 4);
    };

  const getDisplayTasks = () => {
    if (isSearchActive && searchCategory !== 'teams') {
      return searchResults
        .filter(result => result.type === 'task')
        .map(result => result.data as Task)
        .slice(0, 5);
    }
    return recentTasks;
  };

  const getDisplayDueTasks = () => {
    if (isSearchActive && searchCategory !== 'teams') {
      const taskResults = searchResults
        .filter(result => result.type === 'task')
        .map(result => result.data as Task);
      
      // Filter for due tasks from search results
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return taskResults.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate <= tomorrow && task.status !== 4;
      }).slice(0, 3);
    }
    return dueTasks;
  };

  // Helper functions
  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'default';
      case 2: return 'primary';
      case 3: return 'warning';
      case 4: return 'success';
      case 5: return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return 'Backlog';
      case 2: return 'To Do';
      case 3: return 'In Progress';
      case 4: return 'Done';
      case 5: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'error';
      case 4: return 'error';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Urgent';
      default: return 'Unknown';
    }
  };

  const getTaskStatusIcon = (status: number) => {
    switch (status) {
      case 1: return <PendingIcon color="disabled" />;
      case 2: return <PendingIcon color="action" />;
      case 3: return <InProgressIcon color="primary" />;
      case 4: return <CheckIcon color="success" />;
      case 5: return <NotificationIcon color="error" />;
      default: return <PendingIcon color="disabled" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMemberAvatars = (members: any[] = []) => {
    if (members.length === 0) {
      return (
        <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}>
          <PersonIcon sx={{ fontSize: 14 }} />
        </Avatar>
      );
    }

    return (
      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
        {members.map((member, index) => (
          <Avatar 
            key={index}
            sx={{ bgcolor: 'primary.main' }}
            alt={`${member.user?.first_name} ${member.user?.last_name}`}
          >
            {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
          </Avatar>
        ))}
      </AvatarGroup>
    );
  };

  const SearchResultsHeader = () => (
    <Box sx={{ mb: 3, mt: 1 }}>
      <Paper sx={{ 
        p: isMobile ? 1.5 : 2, 
        borderRadius: 2,
        backgroundColor: 'primary.50',
        border: '1px solid',
        borderColor: 'primary.100'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: isMobile ? 1 : 2,
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Typography variant="subtitle1" fontWeight="600" color="primary.dark">
            Search Results
          </Typography>
          <Button
            startIcon={<ClearIcon />}
            onClick={handleSearchClear}
            size="small"
            sx={{ 
              minWidth: 'auto',
              px: isMobile ? 1 : 2
            }}
          >
            {isMobile ? 'Clear' : 'Clear Search'}
          </Button>
        </Box>
        
        <Tabs
          value={searchCategory}
          onChange={handleSearchCategoryChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            minHeight: isMobile ? 40 : 48,
            '& .MuiTab-root': {
              minHeight: isMobile ? 40 : 48,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              px: isMobile ? 1.5 : 2,
              minWidth: 'auto'
            }
          }}
        >
          <Tab label="All" value="all" />
          <Tab label="Teams" value="teams" />
          <Tab label="Projects" value="projects" />
          <Tab label="Tasks" value="tasks" />
        </Tabs>
        
        <Typography variant="body2" color="primary.700" sx={{ mt: 1, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Typography>
      </Paper>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 3
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading your workspace...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      pb: isMobile ? 8 : 0
    }}>
      {/* FIXED HEADER with stable HeaderContent */}
      <CommonHeader 
        title={`Welcome back, ${user?.first_name || 'User'}!`}
        subtitle="Here's what's happening across your teams"
        variant="dashboard"
        customActions={headerContent}
        sx={{
          minHeight: isMobile ? 100 : 120,
          py: isMobile ? 2 : 3,
          mb: isMobile ? 1 : 0
        }}
      />

      <Container 
        maxWidth="xl" 
        sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: isMobile ? 2 : 2,
          mt: isMobile ? 1 : 0
        }}
      >
        {/* Search Results Header */}
        {isSearchActive && <SearchResultsHeader />}

        {/* Stats Overview */}
        <Grid container spacing={2} sx={{ mb: 4, mt: isMobile ? 1 : 0 }}>
          {/* Team Stats Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
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
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <TeamsIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="primary.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {dashboardStats.totalTeams}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Teams
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Project Stats Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
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
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'secondary.50',
                  color: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <ProjectIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="secondary.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {dashboardStats.totalProjects}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Projects
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Completed Tasks Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
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
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'success.50',
                  color: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <CheckIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="success.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {dashboardStats.completedTasks}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Tasks Done
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Due Soon Card */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'white', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s ease',
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
                <Box sx={{ 
                  p: isMobile ? 1 : 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'warning.50',
                  color: 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50
                }}>
                  <ScheduleIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    color="warning.main"
                    sx={{ 
                      lineHeight: 1.1,
                      mb: 0.5,
                      fontSize: isMobile ? '1.25rem' : '1.5rem'
                    }}
                  >
                    {dashboardStats.tasksDueToday}
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                  >
                    Due Soon
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Empty search state */}
        {isSearchActive && searchResults.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No results found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your search terms or browse different categories
            </Typography>
          </Box>
        )}

        {/* Main Content Grid */}
        {(!isSearchActive || searchResults.length > 0) && (
          <Grid container spacing={3} sx={{ mt: isMobile ? 1 : 0 }}>
            {/* Left Column - Teams & Tasks */}
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                {/* Teams Section */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    backgroundColor: 'white', 
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider', 
                        backgroundColor: 'grey.50' 
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          flexWrap: 'wrap', 
                          gap: 2 
                        }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
                              Your Teams
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {/* NEW FIXED LOGIC: Uses the pre-calculated stat from backend */}
                              {teams.length} team{teams.length !== 1 ? 's' : ''} • {dashboardStats.teamMembers} member{dashboardStats.teamMembers !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              variant="outlined"
                              startIcon={<GroupAddIcon />}
                              onClick={() => setJoinTeamDialogOpen(true)}
                              sx={{
                                borderRadius: 2,
                                px: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                              }}
                            >
                              Join Team
                            </Button>
                            
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => setCreateTeamDialogOpen(true)}
                              sx={{
                                borderRadius: 2,
                                px: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                              }}
                            >
                              Create Team
                            </Button>
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        {getDisplayTeams().length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <TeamsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary" paragraph>
                              {isSearchActive ? 'No teams match your search' : 'No teams yet. Create your first team to get started.'}
                            </Typography>
                            {!isSearchActive && (
                              <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateTeamDialogOpen(true)}
                                sx={{ borderRadius: 2 }}
                              >
                                Create Team
                              </Button>
                            )}
                          </Box>
                        ) : (
                          <>
                            <Grid container spacing={2}>
                              {getDisplayTeams().map((team) => (
                                <Grid item xs={12} sm={6} key={team.id}>
                                  <Card sx={{ 
                                    cursor: 'pointer', 
                                    borderRadius: 2, 
                                    border: '1px solid', 
                                    borderColor: 'divider',
                                    transition: 'all 0.2s ease',
                                    height: '100%',
                                    '&:hover': { 
                                      borderColor: 'primary.main',
                                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)'
                                    }
                                  }}
                                  onClick={() => navigate(`/team/${team.id}`)}
                                  >
                                    <CardContent sx={{ p: 2.5, position: 'relative' }}>
                                    <Chip 
                                      label={`${team.project_count || 0} projects`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ position: 'absolute', top: 16, right: 16 }}
                                      />

                                      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1, pr: 6 }}>
                                        {team.name}
                                      </Typography>

                                        {/* FIXED CODE (Consistent Height) */}
                                        <Typography 
                                          variant="body2" 
                                          color="text.secondary" 
                                          sx={{ 
                                            mb: 2,
                                            minHeight: '40px', 
                                            // 2. Handle text overflow cleanly
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            // 3. Style empty state differently (optional)
                                            fontStyle: team.description ? 'normal' : 'normal',
                                            opacity: team.description ? 1 : 0.5
                                          }}
                                        >
                                          {team.description || 'No description provided'}
                                        </Typography>
                                        

                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          {team.member_count} members
                                        </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {/* Backend sends 'created_by_name', ensure you use that */}
                                            By {team.created_by_name}
                                          </Typography>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>

                            {!isSearchActive && teams.length > 4 && (
                              <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <Button 
                                  variant="text"
                                  onClick={toggleShowAllTeams}
                                  startIcon={showAllTeams ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  sx={{ textTransform: 'none' }}
                                >
                                  {showAllTeams ? 'Show Less' : `View All ${teams.length} Teams`}
                                </Button>
                              </Box>
                            )}
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Tasks Section */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    backgroundColor: 'white', 
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider', 
                        backgroundColor: 'grey.50' 
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          flexWrap: 'wrap', 
                          gap: 2 
                        }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
                              My Tasks
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getDisplayTasks().length} task{getDisplayTasks().length !== 1 ? 's' : ''}
                              {isSearchActive && ' (filtered)'}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            startIcon={<TaskIcon />}
                            onClick={() => navigate('/my-work')}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: '600'
                            }}
                          >
                            View All
                          </Button>
                        </Box>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        {getDisplayTasks().length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <TaskIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary">
                              {isSearchActive ? 'No tasks match your search' : 'No tasks assigned to you'}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {getDisplayTasks().map((task) => (
                              <Box 
                                key={task.id}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2, 
                                  p: 2, 
                                  borderRadius: 2, 
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'grey.50',
                                    borderColor: 'primary.main'
                                  }
                                }}
                                onClick={() => navigate(`/team/${task.team_id}/project/${task.project_id}/task/${task.id}`)}
                              >
                                <Box sx={{ color: 'primary.main' }}>
                                  {getTaskStatusIcon(task.status)}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                                    {task.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {task.project_name}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip 
                                    label={getPriorityText(task.priority)} 
                                    size="small" 
                                    color={getPriorityColor(task.priority) as any}
                                    variant="outlined"
                                  />
                                  {task.due_date && (
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(task.due_date)}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Right Column - Projects & Due Soon */}
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                {/* Projects Section */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    backgroundColor: 'white', 
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider', 
                        backgroundColor: 'grey.50' 
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          flexWrap: 'wrap', 
                          gap: 2 
                        }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
                              Recent Projects
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {isSearchActive ? 'Search results' : 'Across all teams'}
                            </Typography>
                          </Box>

                          {/* UPDATED ACTION BUTTONS SECTION */}
                          {!isSearchActive && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="outlined"
                                startIcon={<ListIcon />}
                                onClick={() => navigate('/projects')}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: '600',
                                  px: 2
                                }}
                              >
                                View All
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateProjectDialogOpen(true)}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: '600'
                                }}
                              >
                                New Project
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        {getDisplayProjects().length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <ProjectIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary" paragraph>
                              {isSearchActive ? 'No projects match your search' : 'No projects yet. Create your first project.'}
                            </Typography>
                            {!isSearchActive && (
                              <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateProjectDialogOpen(true)}
                                sx={{ borderRadius: 2 }}
                              >
                                Create Project
                              </Button>
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {getDisplayProjects().map((project) => (
                              <Box 
                                key={project.id}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'flex-start', 
                                  gap: 2, 
                                  p: 2, 
                                  borderRadius: 2, 
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'grey.50',
                                    borderColor: 'primary.main'
                                  }
                                }}
                                onClick={() => {
                                  if (project.team_id) {
                                    navigate(`/team/${project.team_id}/project/${project.id}`);
                                  }
                                }}
                              >
                                <Box sx={{ 
                                  p: 1, 
                                  borderRadius: 2, 
                                  backgroundColor: 'primary.50',
                                  color: 'primary.main',
                                  flexShrink: 0
                                }}>
                                  <ProjectIcon fontSize="small" />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                                    {project.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    {project.team_name} • {project.task_count} tasks
                                  </Typography>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={project.progress || 0} 
                                      sx={{ 
                                        flex: 1, 
                                        mr: 1,
                                        height: 4,
                                        borderRadius: 2
                                      }} 
                                    />
                                    <Typography variant="caption" fontWeight="600">
                                      {project.progress || 0}%
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {renderMemberAvatars(project.team_members)}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Due Soon Section */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    backgroundColor: 'white', 
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        p: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider', 
                        backgroundColor: 'warning.50' 
                      }}>
                        <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }} color="warning.dark">
                          Due Soon
                        </Typography>
                        <Typography variant="body2" color="warning.dark">
                          {getDisplayDueTasks().length} task{getDisplayDueTasks().length !== 1 ? 's' : ''} needing attention
                          {isSearchActive && ' (filtered)'}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        {getDisplayDueTasks().length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CheckIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1" color="text.secondary">
                              {isSearchActive ? 'No due tasks match your search' : 'No tasks due soon'}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {getDisplayDueTasks().map((task) => (
                              <Box 
                                key={task.id}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2, 
                                  p: 2, 
                                  borderRadius: 2, 
                                  border: '1px solid',
                                  borderColor: 'warning.200',
                                  backgroundColor: 'warning.50',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'warning.100'
                                  }
                                }}
                                onClick={() => navigate(`/team/${task.team_id}/project/${task.project_id}/task/${task.id}`)}
                              >
                                <Box sx={{ color: 'warning.main' }}>
                                  <ScheduleIcon fontSize="small" />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                                    {task.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Due {task.due_date ? formatDate(task.due_date) : 'soon'}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={getPriorityText(task.priority)} 
                                  size="small" 
                                  color={getPriorityColor(task.priority) as any}
                                />
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Rest of the component remains the same */}
      </Container>

      {/* Dialogs and other components remain the same */}
      <JoinTeamDialog open={joinTeamDialogOpen} onClose={() => setJoinTeamDialogOpen(false)} />
      <CreateProjectDialog
        open={createProjectDialogOpen}
        onClose={() => setCreateProjectDialogOpen(false)}
        onProjectCreated={handleCreateProject}
      />

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialogOpen} onClose={() => setCreateTeamDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: '600' }}>
          Create New Team
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              label="Team Name"
              required
              fullWidth
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              placeholder="Enter team name"
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              placeholder="Describe your team's purpose"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setCreateTeamDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTeam} 
            variant="contained" 
            disabled={!newTeam.name.trim() || creatingTeam}
            startIcon={creatingTeam ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {creatingTeam ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Menu */}
      <Menu anchorEl={teamMenuAnchor} open={Boolean(teamMenuAnchor)} onClose={handleTeamMenuClose}>
        <MenuItem onClick={handleViewTeam}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          View Team
        </MenuItem>
        <MenuItem onClick={handleInviteToTeam}>
          <ListItemIcon>
            <GroupAddIcon fontSize="small" />
          </ListItemIcon>
          Invite Members
        </MenuItem>
        <MenuItem onClick={handleTeamSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Team Settings
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="create team"
          onClick={() => setCreateTeamDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default Dashboard;