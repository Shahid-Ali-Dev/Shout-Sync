// src/shared/services/activityAPI.ts
import api from './api';

export const activityAPI = {
  // Get recent user activities
  getUserActivities: (limit: number = 10) => 
    api.get(`/auth/activities?limit=${limit}`),
  
  // Log user activity
  logActivity: (data: {
    type: string;
    action: string;
    details?: any;
    entityId?: string;
    entityType?: string;
  }) => api.post('/auth/activities/log', data),
  
  // Get activity summary
  getActivitySummary: (days: number = 7) => 
    api.get(`/auth/activities/summary?days=${days}`),
};

export default activityAPI;