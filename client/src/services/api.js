import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const staffAPI = {
  create: (staffData) => api.post('/staff', staffData),
  getAll: () => api.get('/staff'),
  getById: (staffId) => api.get(`/staff/${staffId}`),
};

export const tasksAPI = {
  create: (taskData) => api.post('/tasks', taskData),
  getAll: (params = {}) => api.get('/tasks', { params }),
  getById: (taskId) => api.get(`/tasks/${taskId}`),
  update: (taskId, updates) => api.put(`/tasks/${taskId}`, updates),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
};

export default api;