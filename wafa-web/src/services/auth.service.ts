import type { SessionUser } from '../types';
import { apiRequest, authToken } from './apiClient';

interface LoginResponse { token: string; user: SessionUser }

export const authService = {
  async login(username: string, password: string) {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, device_name: 'wafaa-web' }),
    });
    authToken.set(result.token);
    return result.user;
  },
  me: () => apiRequest<SessionUser>('/auth/me'),
  async logout() {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } finally { authToken.clear(); }
  },
};
