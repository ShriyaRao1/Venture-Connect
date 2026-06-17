import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vc_token');
      localStorage.removeItem('vc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
};

// ── Startups ─────────────────────────────────────────────────────────────────
export const startupAPI = {
  getAll: (params) => api.get('/startups', { params }),
  getMy:  ()       => api.get('/startups/my'),
  getOne: (id)     => api.get(`/startups/${id}`),
  create: (data)   => api.post('/startups', data),
  update: (id, data) => api.put(`/startups/${id}`, data),
  delete: (id)     => api.delete(`/startups/${id}`),
  save:   (id)     => api.post(`/startups/${id}/save`),
};

// ── Connections ───────────────────────────────────────────────────────────────
export const connectionAPI = {
  express:  (data)       => api.post('/connections', data),
  received: ()           => api.get('/connections/received'),
  sent:     ()           => api.get('/connections/sent'),
  respond:  (id, status) => api.put(`/connections/${id}`, { status }),
  withdraw: (id)         => api.delete(`/connections/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  investors:     ()     => api.get('/users/investors'),
  profile:       (id)   => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  updatePassword:(data) => api.put('/users/password', data),
  saved:         ()     => api.get('/users/saved'),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messageAPI = {
  send:         (data)   => api.post('/messages', data),
  inbox:        ()       => api.get('/messages'),
  conversation: (userId) => api.get(`/messages/${userId}`),
  unreadCount:  ()       => api.get('/messages/unread/count'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  publicStats:   ()         => api.get('/admin/public-stats'),
  stats:         ()         => api.get('/admin/stats'),
  users:         (params)   => api.get('/admin/users', { params }),
  updateUserRole:(id, role)  => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser:    (id)        => api.delete(`/admin/users/${id}`),
  startups:      (params)   => api.get('/admin/startups', { params }),
  deleteStartup: (id)        => api.delete(`/admin/startups/${id}`),
};

export default api;
