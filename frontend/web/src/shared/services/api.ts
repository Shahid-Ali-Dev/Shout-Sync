import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // Remove /auth from here
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData: any) => api.post('/auth/register/', userData),
  login: (credentials: any) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  getProfile: () => api.get('/auth/profile/'),
  
  // Public invitation endpoints (no authentication required)
  acceptInvitationPublic: (token: string) => api.post(`/auth/invitations/public/${token}/accept/`),
  rejectInvitationPublic: (token: string) => api.post(`/auth/invitations/public/${token}/reject/`),
  getInvitationDetails: (token: string) => api.get(`/auth/invitations/public/${token}/`),
  
  // Authenticated invitation endpoints
  acceptInvitation: (token: string) => api.post(`/auth/invitations/${token}/accept/`),
  rejectInvitation: (token: string) => api.post(`/auth/invitations/${token}/reject/`),
  getPendingInvitations: () => api.get('/auth/invitations/pending/'),

  checkPendingInvitations: (email: string) => 
    api.get(`/auth/invitations/check-pending/?email=${email}`),
  
  acceptPendingInvitations: (email: string) => 
    api.post('/auth/invitations/accept-pending/', { email }),
};

export default api;