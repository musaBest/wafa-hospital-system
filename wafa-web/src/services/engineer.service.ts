import { apiRequest } from './apiClient';
import type { DeletedItemRecord, EngineerActivityLog, EngineerSessionLog, EngineerUserOption } from '../types';

export interface EngineerActivityResponse {
  users: EngineerUserOption[];
  logs: EngineerActivityLog[];
  sessions: EngineerSessionLog[];
  summary: { logs: number; sessions: number; openSessions: number; usersActive: number };
}

const qs = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const engineerService = {
  activity: (params: { from?: string; to?: string; userId?: string; search?: string }) =>
    apiRequest<EngineerActivityResponse>(`/engineer-console/activity${qs({ from: params.from, to: params.to, user_id: params.userId, search: params.search })}`, { cache: 'no-store' }),
  trash: (params: { type?: string; search?: string }) =>
    apiRequest<DeletedItemRecord[]>(`/engineer-console/trash${qs({ type: params.type, search: params.search })}`, { cache: 'no-store' }),
  restoreTrash: (id: string) => apiRequest<DeletedItemRecord>(`/engineer-console/trash/${id}/restore`, { method: 'POST' }),
};
