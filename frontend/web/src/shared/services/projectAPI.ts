import api from './api';

export const projectAPI = {
  // Projects
  getProjects: (teamId: string) => api.get(`/auth/teams/${teamId}/projects/`),
  createProject: (teamId: string, data: any) => api.post(`/auth/teams/${teamId}/projects/`, data),
  getProject: (teamId: string, projectId: string) => api.get(`/auth/teams/${teamId}/projects/${projectId}/`),
  updateProject: (teamId: string, projectId: string, data: any) => api.put(`/auth/teams/${teamId}/projects/${projectId}/`, data),
  deleteProject: (teamId: string, projectId: string) => api.delete(`/auth/teams/${teamId}/projects/${projectId}/`),
  
  // Project Members
  getProjectMembers: (teamId: string, projectId: string) => api.get(`/auth/teams/${teamId}/projects/${projectId}/members/`),
  addProjectMember: (teamId: string, projectId: string, data: { email: string; role: number }) => api.post(`/auth/teams/${teamId}/projects/${projectId}/members/`, data),
  
  // Tasks
  getTasks: (teamId: string, projectId: string, params?: any) => api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/`, { params }),
  createTask: (teamId: string, projectId: string, data: any) => api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/`, data),
  getTask: (teamId: string, projectId: string, taskId: string) => api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`),
  updateTask: (teamId: string, projectId: string, taskId: string, data: any) => api.put(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`, data),
  deleteTask: (teamId: string, projectId: string, taskId: string) => api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`),
  
  // Subtasks
  getSubtasks: (teamId: string, projectId: string, taskId: string) => api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/`),
  createSubtask: (teamId: string, projectId: string, taskId: string, data: any) => api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/`, data),
  updateSubtask: (teamId: string, projectId: string, taskId: string, subtaskId: string, data: any) => api.put(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/`, data),
  deleteSubtask: (teamId: string, projectId: string, taskId: string, subtaskId: string) => api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/`),
  
  // Comments
  getTaskComments: (teamId: string, projectId: string, taskId: string) => api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/`),
  createTaskComment: (teamId: string, projectId: string, taskId: string, data: any) => api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/`, data),

  
};

export default projectAPI;