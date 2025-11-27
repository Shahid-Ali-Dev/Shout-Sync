import api from './api';

export const notificationAPI = {
  getNotifications: () => api.get('/auth/notifications/'),
  markAsRead: (notificationId: string) => api.post(`/auth/notifications/${notificationId}/read/`),
  markAllAsRead: () => api.post('/auth/notifications/read-all/'),
  deleteNotification: (notificationId: string) => api.delete(`/auth/notifications/${notificationId}/`),
  
  // Fix these endpoints - they should use the public endpoints
  acceptInvitation: (token: string) => api.post(`/auth/invitations/public/${token}/accept/`),
  rejectInvitation: (token: string) => api.post(`/auth/invitations/public/${token}/reject/`),
};

export default notificationAPI;