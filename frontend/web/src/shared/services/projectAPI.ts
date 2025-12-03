// src/shared/services/projectAPI.ts - OPTIMIZED VERSION
import api from './api';

export const projectAPI = {
  // ==================== PROJECTS (OPTIMIZED) ====================
  getProjects: (teamId: string, params?: { 
    status?: number; 
    search?: string; 
    page?: number; 
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) => api.get(`/auth/teams/${teamId}/projects/`, { params }),
  
  // OPTIMIZED: Create project with paginated member assignment
  createProject: (teamId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/`, data),
  
  // OPTIMIZED: Create project with optimized backend handling
  createProjectOptimized: (teamId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/create-optimized/`, data),
  
  getProject: (teamId: string, projectId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/`),
  
  updateProject: (teamId: string, projectId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/projects/${projectId}/`, data),
  
  deleteProject: (teamId: string, projectId: string) => 
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/`),

  // ==================== PROJECT PROGRESS & ANALYTICS ====================
  getProjectProgress: (teamId: string, projectId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/progress/`),
  
  getProjectAnalytics: (teamId: string, projectId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/analytics/`),

  // ==================== PROJECT MEMBERS (OPTIMIZED) ====================
  getProjectMembers: (teamId: string, projectId: string, params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/members/`, { params }),
  
  // OPTIMIZED: Add member with validation
  addProjectMember: (teamId: string, projectId: string, data: { 
    email: string; 
    role: number;
    send_notification?: boolean;
  }) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/members/`, data),
  
  updateProjectMemberRole: (teamId: string, projectId: string, memberId: string, data: { role: number }) =>
    api.put(`/auth/teams/${teamId}/projects/${projectId}/members/${memberId}/`, data),
  
  removeProjectMember: (teamId: string, projectId: string, memberId: string) =>
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/members/${memberId}/`),
  
  // Bulk member operations
  bulkAddProjectMembers: (teamId: string, projectId: string, data: { 
    member_ids: string[]; 
    role: number;
    send_notifications?: boolean;
  }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/members/bulk-add/`, data),

  // ==================== TASKS (OPTIMIZED) ====================
  getTasks: (teamId: string, projectId: string, params?: any) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/`, { params }),
  
  createTask: (teamId: string, projectId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/`, data),
  
  getTask: (teamId: string, projectId: string, taskId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`),
  
  updateTask: (teamId: string, projectId: string, taskId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`, data),
  
  deleteTask: (teamId: string, projectId: string, taskId: string) => 
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/`),

  // Task bulk operations
  bulkUpdateTasks: (teamId: string, projectId: string, data: { task_ids: string[]; updates: any }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/bulk-update/`, data),
  
  bulkDeleteTasks: (teamId: string, projectId: string, data: { task_ids: string[] }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/bulk-delete/`, data),

  // Task assignments and status
  assignTask: (teamId: string, projectId: string, taskId: string, data: { assignee_id: string }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/assign/`, data),
  
  updateTaskStatus: (teamId: string, projectId: string, taskId: string, data: { status: number }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/status/`, data),

  // ==================== SUBTASKS ====================
  getSubtasks: (teamId: string, projectId: string, taskId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/`),
  
  createSubtask: (teamId: string, projectId: string, taskId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/`, data),
  
  getSubtask: (teamId: string, projectId: string, taskId: string, subtaskId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/`),
  
  updateSubtask: (teamId: string, projectId: string, taskId: string, subtaskId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/`, data),
  
  deleteSubtask: (teamId: string, projectId: string, taskId: string, subtaskId: string) => 
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/`),

  // ==================== COMMENTS ====================
  getTaskComments: (teamId: string, projectId: string, taskId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/`),
  
  createTaskComment: (teamId: string, projectId: string, taskId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/`, data),
  
  updateTaskComment: (teamId: string, projectId: string, taskId: string, commentId: string, data: any) =>
    api.put(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}/`, data),
  
  deleteTaskComment: (teamId: string, projectId: string, taskId: string, commentId: string) =>
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}/`),

  // ==================== ATTACHMENTS ====================
  getTaskAttachments: (teamId: string, projectId: string, taskId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/attachments/`),
  
  uploadTaskAttachment: (teamId: string, projectId: string, taskId: string, formData: FormData) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  deleteTaskAttachment: (teamId: string, projectId: string, taskId: string, attachmentId: string) =>
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/`),

  // ==================== ACTIVITY & HISTORY ====================
  getProjectActivity: (teamId: string, projectId: string, params?: any) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/activity/`, { params }),
  
  getTaskActivity: (teamId: string, projectId: string, taskId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/activity/`),

  // In projectAPI.ts, add this method if needed:
getRecentActivity: (teamId: string, limit?: number) =>
  api.get(`/auth/teams/${teamId}/activity/recent/?limit=${limit || 10}`),

  // ==================== SEARCH & FILTERS (OPTIMIZED) ====================
  searchProjects: (teamId: string, query: string, params?: {
    page?: number;
    page_size?: number;
    status?: number;
    priority?: number;
  }) =>
    api.get(`/auth/teams/${teamId}/projects/search/`, {
      params: { q: query, ...params }
    }),
  
  searchTasks: (teamId: string, projectId: string, query: string, filters?: any) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/search/`, {
      params: { q: query, ...filters }
    }),

  // ==================== DASHBOARD SPECIFIC ====================
  getUserTasks: (teamId: string, userId?: string, params?: {
    status?: number;
    priority?: number;
    limit?: number;
  }) =>
    api.get(`/auth/teams/${teamId}/projects/user-tasks/${userId ? `${userId}/` : ''}`, { params }),
  
  getDueTasks: (teamId: string, days: number = 7, limit?: number) =>
    api.get(`/auth/teams/${teamId}/projects/due-tasks/`, {
      params: { days, limit }
    }),
  
  getProjectStats: (teamId: string) =>
    api.get(`/auth/teams/${teamId}/projects/stats/`),

  // ==================== TEMPLATES & QUICK ACTIONS ====================
  getProjectTemplates: () =>
    api.get('/auth/projects/templates/'),
  
  createProjectFromTemplate: (teamId: string, templateId: string, data?: any) =>
    api.post(`/auth/teams/${teamId}/projects/create-from-template/${templateId}/`, data),
  
  createQuickTask: (teamId: string, projectId: string, data: { 
    title: string; 
    description?: string; 
    priority?: number;
    assignee_id?: string;
  }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/quick-create/`, data),

  // ==================== EXPORT & IMPORT ====================
  exportProjectData: (teamId: string, projectId: string, format: 'json' | 'csv' = 'json') =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/export/?format=${format}`, {
      responseType: 'blob'
    }),
  
  importProjectData: (teamId: string, projectId: string, formData: FormData) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // ==================== ADVANCED FEATURES ====================
  getProjectTimeline: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/timeline/`),
  
  updateProjectTimeline: (teamId: string, projectId: string, data: { start_date?: string; end_date?: string }) =>
    api.put(`/auth/teams/${teamId}/projects/${projectId}/timeline/`, data),

  getTaskDependencies: (teamId: string, projectId: string, taskId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/dependencies/`),
  
  addTaskDependency: (teamId: string, projectId: string, taskId: string, data: { depends_on_task_id: string }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/dependencies/`, data),
  
  removeTaskDependency: (teamId: string, projectId: string, taskId: string, dependencyId: string) =>
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}/`),

  // ==================== PROJECT COLLABORATION ====================
  getProjectCollaborators: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/collaborators/`),

  // ==================== PROJECT SETTINGS ====================
  getProjectSettings: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/settings/`),
  
  updateProjectSettings: (teamId: string, projectId: string, data: any) =>
    api.put(`/auth/teams/${teamId}/projects/${projectId}/settings/`, data),

  // ==================== PROJECT TRANSFER ====================
  transferProject: (teamId: string, projectId: string, data: { target_team_id: string }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/transfer/`, data),

  // ==================== PROJECT VALIDATION ====================
  validateProjectName: (teamId: string, name: string, projectId?: string) => {
    let url = `/auth/teams/${teamId}/projects/validate-name/?name=${encodeURIComponent(name)}`;
    if (projectId) url += `&project_id=${projectId}`;
    return api.get(url);
  },

  // ==================== PROJECT PERMISSIONS ====================
  getProjectPermissions: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/permissions/`),
  
  updateProjectPermissions: (teamId: string, projectId: string, data: any) =>
    api.put(`/auth/teams/${teamId}/projects/${projectId}/permissions/`, data),

  // ==================== PROJECT FAVORITES ====================
  toggleProjectFavorite: (teamId: string, projectId: string, favorite: boolean) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/favorite/`, { favorite }),
  
  getFavoriteProjects: (teamId?: string) => {
    const url = teamId 
      ? `/auth/projects/favorites/?team_id=${teamId}`
      : '/auth/projects/favorites/';
    return api.get(url);
  },

  // ==================== PROJECT ARCHIVING ====================
  archiveProject: (teamId: string, projectId: string) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/archive/`),
  
  unarchiveProject: (teamId: string, projectId: string) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/unarchive/`),
  
  getArchivedProjects: (teamId: string) =>
    api.get(`/auth/teams/${teamId}/projects/archived/`),

  // ==================== PROJECT SNAPSHOTS ====================
  createProjectSnapshot: (teamId: string, projectId: string, data: { 
    name: string; 
    description?: string 
  }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/snapshots/`, data),
  
  getProjectSnapshots: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/snapshots/`),
  
  restoreProjectSnapshot: (teamId: string, projectId: string, snapshotId: string) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/snapshots/${snapshotId}/restore/`),

  // ==================== PROJECT SHARING ====================
  generateShareLink: (teamId: string, projectId: string, data?: {
    expires_at?: string;
    access_level?: 'view' | 'comment' | 'edit';
  }) =>
    api.post(`/auth/teams/${teamId}/projects/${projectId}/share/`, data),
  
  getShareLinks: (teamId: string, projectId: string) =>
    api.get(`/auth/teams/${teamId}/projects/${projectId}/share/`),
  
  revokeShareLink: (teamId: string, projectId: string, linkId: string) =>
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/share/${linkId}/`),
};

export default projectAPI;