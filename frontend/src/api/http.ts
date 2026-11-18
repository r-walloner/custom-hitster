import type { Library } from './messages.ts'

export interface Me {
  spotify: { id: string; name: string; library: Library } | null
}

async function call(method: string, url: string, body?: unknown): Promise<Response> {
  const response = await fetch(
    url,
    body === undefined
      ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!response.ok) throw new Error(`${method} ${url} failed with ${response.status}`)
  return response
}

/** Who this browser is. Also gives the browser the session cookie the room socket needs. */
export async function getMe(): Promise<Me> {
  return (await call('GET', '/api/me')).json()
}

export async function createRoom(): Promise<string> {
  const { code } = await (await call('POST', '/api/rooms')).json()
  return code
}

export const startImport = () => call('POST', '/api/me/import')
/** The name this player goes by, from now on and in every lobby they sit in. */
export const setName = (name: string) => call('PUT', '/api/me/name', { name })
export const logout = () => call('POST', '/auth/logout')
export const deleteMe = () => call('DELETE', '/api/me')

export const loginUrl = (next: string) => `/auth/login?next=${encodeURIComponent(next)}`
