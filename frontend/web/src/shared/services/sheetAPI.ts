import api from './api';

export const sheetAPI = {
  // Sheets
  getSheets: (teamId: string, projectId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/sheets/`),
  
  createSheet: (teamId: string, projectId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/sheets/`, data),
  
  getSheet: (teamId: string, projectId: string, sheetId: string) => 
    api.get(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/`),
  
  updateSheet: (teamId: string, projectId: string, sheetId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/`, data),
  
  deleteSheet: (teamId: string, projectId: string, sheetId: string) => 
    api.delete(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/`),

  // Columns
  addColumn: (teamId: string, projectId: string, sheetId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/columns/`, data),

  // Rows
  addRow: (teamId: string, projectId: string, sheetId: string) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/rows/`, {}),

  // Cells
  updateCell: (teamId: string, projectId: string, sheetId: string, cellId: string, data: any) => 
    api.put(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/cells/${cellId}/`, data),
  
  bulkUpdateCells: (teamId: string, projectId: string, sheetId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/bulk-update/`, data),

  // Comments
  getComments: (teamId: string, projectId: string, sheetId: string, cellId?: string) => {
    const params = cellId ? { cell_id: cellId } : {};
    return api.get(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/comments/`, { params });
  },
  
  addComment: (teamId: string, projectId: string, sheetId: string, data: any) => 
    api.post(`/auth/teams/${teamId}/projects/${projectId}/sheets/${sheetId}/comments/`, data),
};

export default sheetAPI;