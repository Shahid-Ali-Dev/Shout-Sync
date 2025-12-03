// src/shared/services/teamAPI.ts - PROPER FIX
import api from './api';

// Define the API methods properly
export const teamAPI = {
  // ==================== TEAM MANAGEMENT ====================
  getTeams: () => api.get('/auth/teams/'),
  createTeam: (data: { name: string; description?: string }) => 
    api.post('/auth/teams/', data),
  getTeam: (teamId: string) => 
    api.get(`/auth/teams/${teamId}/`),
  updateTeam: (teamId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/`, data),
  deleteTeam: (teamId: string, data: { confirmation_name: string }) =>
    api.post(`/auth/teams/${teamId}/delete/`, data),

  // ==================== MEMBER MANAGEMENT ====================
  getTeamMembers: (teamId: string) => 
    api.get(`/auth/teams/${teamId}/members/`),
  
  // FIXED: These should call api.get(), not teamAPI.get()
  getTeamMembersOptimized: (teamId: string, page: number = 1, pageSize: number = 20) => 
    api.get(`/auth/teams/${teamId}/members/optimized/?page=${page}&page_size=${pageSize}`),
  
  searchTeamMembers: (teamId: string, query: string, page: number = 1, role?: number) => {
    let url = `/auth/teams/${teamId}/members/search/?q=${encodeURIComponent(query)}&page=${page}`;
    if (role) {
      url += `&role=${role}`;
    }
    return api.get(url);
  },
  
  inviteMember: (teamId: string, data: { email: string; role: number }) => 
    api.post(`/auth/teams/${teamId}/invite/`, data),
  leaveTeam: (teamId: string) => 
    api.post(`/auth/teams/${teamId}/leave/`),
  removeMember: (teamId: string, memberId: string) => 
    api.delete(`/auth/teams/${teamId}/members/${memberId}/remove/`),
  
  updateMemberRole: (teamId: string, memberId: string, data: { role: number }) =>
    api.put(`/auth/teams/${teamId}/members/${memberId}/update-role/`, data),
  
  transferOwnership: (teamId: string, memberId: string) =>
    api.post(`/auth/teams/${teamId}/members/${memberId}/transfer-ownership/`),

  // ==================== INVITATION MANAGEMENT ====================
  getPendingInvitations: () => api.get('/auth/invitations/pending/'),
  acceptInvitation: (token: string) => api.post(`/auth/invitations/${token}/accept/`),
  rejectInvitation: (token: string) => api.post(`/auth/invitations/${token}/reject/`),
  
  checkPendingInvitations: (email: string) => 
    api.get(`/auth/invitations/check-pending/?email=${encodeURIComponent(email)}`),
  
  getInvitationDetails: (token: string) =>
    api.get(`/auth/invitations/public/${token}/`),
  acceptInvitationPublic: (token: string) =>
    api.post(`/auth/invitations/public/${token}/accept/`),
  rejectInvitationPublic: (token: string) =>
    api.post(`/auth/invitations/public/${token}/reject/`),

  // ==================== JOIN REQUESTS ====================
  requestToJoinTeam: (teamId: string, data: { email: string; message?: string }) =>
    api.post(`/auth/teams/${teamId}/join-request/`, data),
  
  getJoinRequests: (teamId: string) =>
    api.get(`/auth/teams/${teamId}/join-requests/`),
  
  approveJoinRequest: (teamId: string, requestId: string) =>
    api.post(`/auth/teams/${teamId}/join-requests/${requestId}/approve/`),
  
  rejectJoinRequest: (teamId: string, requestId: string) =>
    api.post(`/auth/teams/${teamId}/join-requests/${requestId}/reject/`),

  // ==================== TEAM SETTINGS ====================
  getTeamSettings: (teamId: string) =>
    api.get(`/auth/teams/${teamId}/settings/`),
  
  updateTeamSettings: (teamId: string, data: any) =>
    api.put(`/auth/teams/${teamId}/settings/`, data),
  
  updateTeamSetting: (teamId: string, data: { path: string; value: any }) =>
    api.put(`/auth/teams/${teamId}/settings/update/`, data),

  // ==================== TEAM ACTIVITY ====================
  getTeamActivity: (teamId: string, params?: any) =>
    api.get(`/auth/teams/${teamId}/activity/`, { params }),
  
  getRecentActivity: (teamId: string, limit?: number) =>
    api.get(`/auth/teams/${teamId}/activity/recent/?limit=${limit || 10}`),

  // ==================== VALIDATION ====================
  validateTeamName: (name: string, teamId?: string) => {
    let url = `/auth/teams/validate-name/?name=${encodeURIComponent(name)}`;
    if (teamId) url += `&team_id=${teamId}`;
    return api.get(url);
  },
  
  checkMemberExists: (teamId: string, email: string) =>
    api.get(`/auth/teams/${teamId}/members/check/?email=${encodeURIComponent(email)}`),

  // ==================== BASIC ENDPOINTS ====================
  getTeamsBasic: () => api.get('/teams/'),
  getTeamBasic: (teamId: string) => api.get(`/teams/${teamId}/`),
  getTeamMembersBasic: (teamId: string) => api.get(`/teams/${teamId}/members/`),
};

export default teamAPI;