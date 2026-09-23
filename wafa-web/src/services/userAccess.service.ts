import type { AccessPermission, ManagedUser } from '../types';
import { apiRequest } from './apiClient';

export interface SaveUserDTO {
  username: string;
  display_name: string;
  role: string;
  active: boolean;
  permissions: string[];
  password?: string;
  password_confirmation?: string;
}

export const userAccessService = {
  list: () => apiRequest<ManagedUser[]>(`/users?_=${Date.now()}`, { cache: 'no-store' }),
  permissions: () => apiRequest<AccessPermission[]>(`/access/permissions?_=${Date.now()}`, { cache: 'no-store' }),
  create: (dto: SaveUserDTO) => apiRequest<ManagedUser>('/users', { method: 'POST', cache: 'no-store', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<SaveUserDTO>) => apiRequest<ManagedUser>(`/users/${id}?_=${Date.now()}`, { method: 'PATCH', cache: 'no-store', body: JSON.stringify(dto) }),
  remove: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
};
