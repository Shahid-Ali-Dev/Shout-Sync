// teamAPI.ts - Updated version
import api from './api';

export const teamAPI = {
  // Team management
  getTeams: () => api.get('/auth/teams/'),
  createTeam: (data: { name: string; description?: string }) => 
    api.post('/auth/teams/', data),
  getTeam: (teamId: string) => 
    api.get(`/auth/teams/${teamId}/`),
  updateTeam: (teamId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/`, data),
  deleteTeam: (teamId: string, data: { confirmation_name: string }) =>
    api.post(`/auth/teams/${teamId}/delete/`, data),

  // Member management
  inviteMember: (teamId: string, data: { email: string; role: number }) => 
    api.post(`/auth/teams/${teamId}/invite/`, data),
  leaveTeam: (teamId: string) => 
    api.post(`/auth/teams/${teamId}/leave/`),
  getTeamMembers: (teamId: string) => 
    api.get(`/auth/teams/${teamId}/members/`),
  removeMember: (teamId: string, memberId: string) => 
    api.delete(`/auth/teams/${teamId}/members/${memberId}/remove/`),
  
  // **FIXED: Multiple endpoint options for role update**
  updateMemberRole: (teamId: string, memberId: string, data: { role: number }) =>
    api.put(`/auth/teams/${teamId}/members/${memberId}/update-role/`, data),
  
  // Alternative endpoints (try these if the above doesn't work)
  updateMemberRoleAlt1: (teamId: string, memberId: string, data: { role: number }) =>
    api.patch(`/auth/teams/${teamId}/members/${memberId}/`, data),
  
  updateMemberRoleAlt2: (teamId: string, memberId: string, data: { role: number }) =>
    api.put(`/auth/teams/${teamId}/members/${memberId}/`, data),

  transferOwnership: (teamId: string, memberId: string) =>
    api.post(`/auth/teams/${teamId}/members/${memberId}/transfer-ownership/`),

  // Invitation management
  getPendingInvitations: () => api.get('/auth/invitations/pending/'),
  acceptInvitation: (token: string) => api.post(`/auth/invitations/${token}/accept/`),
  rejectInvitation: (token: string) => api.post(`/auth/invitations/${token}/reject/`),
};

export default teamAPI;