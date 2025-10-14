import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const emailService = {
  logEmail: (emailData) => api.post('/email/log', emailData),
  getLogs: (page = 1, limit = 10) => 
    api.get(`/email/logs?page=${page}&limit=${limit}`),
  getStats: () => api.get('/email/stats')
};

export const documentService = {
  logDocument: (documentData) => api.post('/documents/log', documentData),
  getLogs: (page = 1, limit = 10) => 
    api.get(`/documents/logs?page=${page}&limit=${limit}`),
  getStats: () => api.get('/documents/stats')
};

// UPDATED: statusService to handle both JSON and FormData
export const statusService = {
  updateStatus: (statusData) => {
    // Check if it's FormData (has get method) or regular object
    if (statusData instanceof FormData) {
      return axios.put(`${API_BASE_URL}/status/update`, statusData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      return api.put('/status/update', statusData);
    }
  },
  getStatusHistory: (recordId, recordType) => 
    api.get(`/status/history?recordId=${recordId}&recordType=${recordType}`),
  getStatusStats: (recordType = null) => 
    api.get(recordType ? `/status/stats?recordType=${recordType}` : '/status/stats')
};

export default api;