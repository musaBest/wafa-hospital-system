const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const TOKEN_KEY = 'wafaa_his_api_token_v1';

export const authToken = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authToken.get();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `API_ERROR_${response.status}`);
  }
  const payload = await response.json();
  return (payload.data ?? payload) as T;
}

// Planned Laravel endpoints:
// POST /patients, POST /patients/{id}/visits, POST /invoices,
// GET /doctors/{id}/dashboard, POST /visits/{id}/finish, GET /reports.
