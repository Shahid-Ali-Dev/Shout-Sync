// src/shared/services/taskAPI.ts
import api from './api';

export const taskAPI = {
  // Get user's assigned tasks
  getUserTasks: () => api.get('/auth/tasks/my-tasks/'),
  
  // Get tasks due soon
  getDueTasks: () => api.get('/auth/tasks/due-soon/'),
  
  // Update task status
  updateTaskStatus: (teamId: string, projectId: string, taskId: string, data: { status: number }) =>
    api.patch(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`, data),
  
  // Create task
  createTask: (teamId: string, projectId: string, data: any) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/`, data),
};

export default taskAPI;