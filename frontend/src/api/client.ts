const BASE_URL = '/api'
const USER_ID = 'default-user'

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-user-id': USER_ID,
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), { headers: { 'x-user-id': USER_ID } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.data as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.data as T
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.data as T
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'x-user-id': USER_ID },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.data as T
}

// Health sync (no /api prefix — direct from Shortcut)
export async function syncHealth(body: unknown): Promise<unknown> {
  const res = await fetch('/health/sync', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Sync error: ${res.status}`)
  return res.json()
}
