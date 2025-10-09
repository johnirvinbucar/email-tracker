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

export default api;