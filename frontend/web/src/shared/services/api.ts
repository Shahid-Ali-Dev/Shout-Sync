import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://shout-sync.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`, 
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
  register: (userData: any) => api.post('/register/', userData),  // Remove /auth
  login: (credentials: any) => api.post('/login/', credentials),  // Remove /auth
  logout: () => api.post('/logout/'),  // Remove /auth
  getProfile: () => api.get('/profile/'),  // Remove /auth
  
  // Public invitation endpoints (no authentication required)
  acceptInvitationPublic: (token: string) => api.post(`/invitations/public/${token}/accept/`),
  rejectInvitationPublic: (token: string) => api.post(`/invitations/public/${token}/reject/`),
  getInvitationDetails: (token: string) => api.get(`/invitations/public/${token}/`),
  
  // Authenticated invitation endpoints
  acceptInvitation: (token: string) => api.post(`/invitations/${token}/accept/`),
  rejectInvitation: (token: string) => api.post(`/invitations/${token}/reject/`),
  getPendingInvitations: () => api.get('/invitations/pending/'),

  checkPendingInvitations: (email: string) => 
    api.get(`/invitations/check-pending/?email=${email}`),
  
  acceptPendingInvitations: (email: string) => 
    api.post('/invitations/accept-pending/', { email }),
};

export default api;
