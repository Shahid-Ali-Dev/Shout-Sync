import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  ClickAwayListener,
  Popper,
  Fade,
  Paper,
  LinearProgress,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Chip,
  debounce,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { teamAPI } from '../../shared/services/teamAPI';

// --- Types ---
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string | null;
  last_active?: string;
}

export interface TeamMemberResult extends User {
  teamRole: number;
}

interface TeamMemberSearchProps {
  teamId: string;
  onSelect: (member: TeamMemberResult) => void;
  excludeIds?: string[]; // IDs to filter out (e.g. already selected members)
  placeholder?: string;
  disabled?: boolean;
}

// --- Helpers ---
const formatLastActive = (lastActive?: string): string => {
  if (!lastActive) return 'Never';
  try {
    const date = new Date(lastActive);
    if (isNaN(date.getTime())) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
};

const isUserOnline = (lastActive?: string): boolean => {
  if (!lastActive) return false;
  try {
    const date = new Date(lastActive);
    const now = new Date();
    return (now.getTime() - date.getTime()) < 5 * 60 * 1000; // 5 mins
  } catch {
    return false;
  }
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

const TeamMemberSearch: React.FC<TeamMemberSearchProps> = ({
  teamId,
  onSelect,
  excludeIds = [],
  placeholder = "Search team members...",
  disabled = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const searchAnchorRef = useRef<HTMLDivElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TeamMemberResult[]>([]);
  const [defaultMembers, setDefaultMembers] = useState<TeamMemberResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInitiated, setSearchInitiated] = useState(false);

  // --- API Functions ---

  const loadDefaultMembers = useCallback(async () => {
    if (!teamId) return;
    try {
      // Fetch recently active members (page 1)
      const response = await teamAPI.getTeamMembersOptimized(teamId, 1, 20);
      const data = response.data.results || [];
      
      const processed = data.map((m: any) => {
        const user = m.user || m;
        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          last_active: user.last_active || m.last_active,
          teamRole: m.role,
        };
      });
      setDefaultMembers(processed);
    } catch (error) {
      console.error("Failed to load default members", error);
    }
  }, [teamId]);

  const performSearch = useCallback(async (searchQuery: string, pageNum: number = 1, role: number | 'all' = 'all') => {
    if (!teamId) return;
    setLoading(true);
    try {
      const response = await teamAPI.searchTeamMembers(
        teamId,
        searchQuery,
        pageNum,
        role !== 'all' ? role : undefined
      );

      const data = response.data.results || response.data;
      const processed = data.map((m: any) => {
        const user = m.user || m;
        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          last_active: user.last_active || m.last_active,
          teamRole: m.role,
        };
      });

      if (pageNum === 1) {
        setResults(processed);
      } else {
        setResults(prev => [...prev, ...processed]);
      }
      
      setHasMore(response.data.has_next || false);
      setPage(pageNum);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Debounced Search
  const debouncedSearch = useMemo(
    () => debounce((q: string, r: number | 'all') => {
      performSearch(q, 1, r);
    }, 350),
    [performSearch]
  );

  // --- Effects ---

  // Load defaults when teamId changes
  useEffect(() => {
    if (teamId) {
      loadDefaultMembers();
      setQuery('');
      setRoleFilter('all');
      setResults([]);
    }
  }, [teamId, loadDefaultMembers]);

  // Trigger search when inputs change
  useEffect(() => {
    if (!searchInitiated) return;

    if (query.trim() === '') {
      // Local filter for defaults
      let filtered = defaultMembers;
      if (roleFilter !== 'all') {
        filtered = defaultMembers.filter(m => m.teamRole === roleFilter);
      }
      setResults(filtered);
      setHasMore(false);
    } else {
      debouncedSearch(query, roleFilter);
    }
  }, [query, roleFilter, defaultMembers, searchInitiated, debouncedSearch]);

  // --- Handlers ---

  const handleFocus = () => {
    setSearchInitiated(true);
    setIsOpen(true);
    if (query.trim() === '' && results.length === 0) {
      setResults(defaultMembers);
    }
  };

  const handleSelect = (member: TeamMemberResult) => {
    onSelect(member);
    setIsOpen(false);
    setQuery('');
    // Optional: Reset results to defaults after selection
    setTimeout(() => {
        setResults(defaultMembers);
        setSearchInitiated(false);
    }, 300);
  };

  const handleClickAway = (event: MouseEvent | TouchEvent) => {
    if (
      searchAnchorRef.current &&
      !searchAnchorRef.current.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest('.search-dropdown')
    ) {
      setIsOpen(false);
    }
  };

  // Filter out already selected members from the view
  const displayResults = results.filter(r => !excludeIds.includes(r.id));

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Search Field */}
      <Box sx={{ flex: 1, position: 'relative' }} ref={searchAnchorRef}>
        <TextField
          fullWidth
          placeholder={placeholder}
          value={query}
          disabled={disabled || !teamId}
          onChange={(e) => setQuery(e.target.value)}
          onClick={handleFocus} // Re-open on click
          onFocus={handleFocus}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              '&.Mui-focused': {
                backgroundColor: 'white',
                boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setQuery('');
                    setSearchInitiated(true);
                    setResults(defaultMembers);
                  }}
                  sx={{ opacity: 0.7 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Dropdown Results */}
        <ClickAwayListener onClickAway={handleClickAway}>
          <Popper
            open={isOpen && teamId !== ''}
            anchorEl={searchAnchorRef.current}
            placement="bottom-start"
            className="search-dropdown"
            disablePortal={true}
            modifiers={[
              { name: 'flip', enabled: false },
              { name: 'preventOverflow', enabled: true, options: { boundary: 'scrollParent', padding: 8 } },
              { name: 'offset', options: { offset: [0, 8] } }
            ]}
            style={{
              zIndex: 1500,
              width: searchAnchorRef.current?.clientWidth,
              maxHeight: 400,
              overflowY: 'auto',
              position: 'fixed',
            }}
            transition
          >
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={200}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    backgroundColor: 'white',
                    position: 'relative'
                  }}
                >
                  {loading && (
                    <LinearProgress
                      sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 2 }}
                    />
                  )}

                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">
                      {query ? `Search results for "${query}"` : `Recently active`}
                    </Typography>
                  </Box>

                  {displayResults.length > 0 ? (
                    <>
                      <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto', opacity: loading ? 0.6 : 1 }}>
                        {displayResults.map((member) => (
                          <ListItem
                            key={member.id}
                            button
                            onClick={() => handleSelect(member)}
                            sx={{
                              '&:hover': { backgroundColor: 'action.hover' },
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': { borderBottom: 'none' }
                            }}
                          >
                            <ListItemAvatar>
                              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <Avatar
                                  src={member.avatar || undefined}
                                  sx={{ width: 40, height: 40 }}
                                >
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </Avatar>
                                {member.last_active && isUserOnline(member.last_active) && (
                                  <Box sx={{
                                    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                                    backgroundColor: '#10B981', border: '1px solid white', borderRadius: '50%', zIndex: 2
                                  }} />
                                )}
                              </Box>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight="500">
                                  {member.first_name} {member.last_name}
                                </Typography>
                              }
                              secondary={
                                <Box component="span" sx={{ display: 'block' }}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {member.email}
                                  </Typography>
                                  {member.last_active && (
                                    <Typography
                                      variant="caption"
                                      component="span"
                                      color={isUserOnline(member.last_active) ? 'success.main' : 'text.secondary'}
                                      fontWeight={isUserOnline(member.last_active) ? 600 : 400}
                                      display="block"
                                    >
                                      {isUserOnline(member.last_active)
                                        ? 'Online'
                                        : `Last active: ${formatLastActive(member.last_active)}`
                                      }
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <TeamRoleBadge role={member.teamRole} />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                      {hasMore && query && (
                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                          <Button
                            size="small"
                            onClick={() => performSearch(query, page + 1, roleFilter)}
                            disabled={loading}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            {loading ? 'Loading...' : 'Load More'}
                          </Button>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      {loading ? (
                        <Box sx={{ py: 2 }}>
                          <CircularProgress size={20} />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Searching...
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          {query ? (
                            <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                          ) : (
                            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                          )}
                          <Typography variant="body2" color="text.secondary">
                            {query ? `No members found for "${query}"` : 'No team members available'}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Paper>
              </Fade>
            )}
          </Popper>
        </ClickAwayListener>
      </Box>

      {/* Role Filter */}
      <FormControl sx={{ minWidth: isMobile ? '100%' : 140 }}>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as number | 'all')}
          disabled={disabled || !teamId}
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
  );
};

export default TeamMemberSearch;