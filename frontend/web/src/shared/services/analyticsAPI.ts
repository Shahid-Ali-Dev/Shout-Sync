// src/shared/services/analyticsAPI.ts
import api from './api';

export const analyticsAPI = {
  // Get user productivity metrics
  getUserProductivity: (userId: string) => 
    api.get(`/auth/analytics/user/${userId}/productivity`),
  
  // Get team performance metrics
  getTeamPerformance: (teamId: string) => 
    api.get(`/auth/analytics/team/${teamId}/performance`),
  
  // Get completion trends
  getCompletionTrends: (days: number = 30) => 
    api.get(`/auth/analytics/trends?days=${days}`),
  
  // Export user data
  exportUserData: () => 
    api.get('/auth/analytics/export', { responseType: 'blob' }),

  getDashboardStats: () => api.get('/auth/dashboard/stats/'),
};

export default analyticsAPI;