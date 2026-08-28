/**
 * El-Wafa Hospital Management System — API Service Client
 */

const API_BASE = 'http://127.0.0.1:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('wafa_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'حدث خطأ أثناء معالجة الطلب');
      error.status = response.status;
      error.errors = data.errors || {};
      error.forbidden_role = data.forbidden_role;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Request failed on ${endpoint}:`, error);
    throw error;
  }
}

// 1. Authentication Service
export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  me: () => request('/auth/me'),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
};

// 2. Civil Registry Lookup Service
export const civilRegistryApi = {
  lookup: (nationalId) => request(`/civil-registry/lookup/${encodeURIComponent(nationalId)}`),
};

// 3. Patients Service
export const patientsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/patients${queryString}`);
  },

  get: (id) => request(`/patients/${id}`),

  create: (patientData) =>
    request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),

  update: (id, patientData) =>
    request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    }),

  delete: (id) =>
    request(`/patients/${id}`, {
      method: 'DELETE',
    }),

  getNextId: (year) => {
    const query = year ? `?year=${year}` : '';
    return request(`/patients/next-id${query}`);
  },

  getStats: () => request('/patients/stats'),
};

// 4. Staff Management Service (Admins Only)
export const staffApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/staff${qs}`).catch((err) => {
      // Dev fallback if unauthenticated
      if (err.status === 401) return request(`/dev/staff${qs}`);
      throw err;
    });
  },

  create: (staffData) =>
    request('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    }).catch((err) => {
      if (err.status === 401) {
        return request('/dev/staff', {
          method: 'POST',
          body: JSON.stringify(staffData),
        });
      }
      throw err;
    }),

  update: (id, staffData) =>
    request(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    }),

  delete: (id) =>
    request(`/staff/${id}`, {
      method: 'DELETE',
    }),
};

// 5. Financial Transfers Service (Accountant Exclusive)
export const transfersApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/transfers${qs}`).catch((err) => {
      if (err.status === 401) return request(`/dev/transfers${qs}`);
      throw err;
    });
  },

  getStats: () =>
    request('/transfers/stats').catch((err) => {
      if (err.status === 401) return request('/dev/transfers/stats');
      throw err;
    }),

  create: (transferData) =>
    request('/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    }).catch((err) => {
      if (err.status === 401) {
        return request('/dev/transfers', {
          method: 'POST',
          body: JSON.stringify(transferData),
        });
      }
      throw err;
    }),

  get: (id) => request(`/transfers/${id}`),
};

// 6. Notifications Service
export const notificationsApi = {
  list: (role = 'all_staff') => request(`/notifications?role=${encodeURIComponent(role)}`),

  unreadCount: (role = 'all_staff') => request(`/notifications/unread-count?role=${encodeURIComponent(role)}`),

  markAsRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: (role = 'all_staff') =>
    request('/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
};
