import axios from 'axios';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ta_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
