/* CUSTOMIZATION: Backend API URL
 * - In dev (localhost): uses Vite proxy → '/api'
 * - On Vercel: reads from localStorage 'stockpro_api_url'
 * - The URL is set via the connection screen shown when backend is unreachable
 */
function getApiBase(): string {
  // In dev (Vite proxy available), use relative path
  if (window.location.hostname === 'localhost') return '/api'
  // On Vercel/production, use stored tunnel URL
  return localStorage.getItem('stockpro_api_url') || '/api'
}

export const API_BASE = getApiBase()

export function setApiUrl(url: string) {
  localStorage.setItem('stockpro_api_url', url)
  window.location.reload()
}

export function getApiUrl(): string | null {
  return localStorage.getItem('stockpro_api_url')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('stockpro_auth_token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || 'Erreur réseau')
  }
  return res.json()
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function generateId(): string {
  return crypto.randomUUID()
}
