import type { Library } from './messages.ts'

export interface Me {
  spotify: { id: string; name: string; image_url: string | null; library: Library } | null
}

/** Somewhere the deck can take songs from: liked songs, top songs, recent plays, a playlist. */
export interface Source {
  id: string
  kind: 'liked' | 'top' | 'recent' | 'playlist' | 'collaborative'
  name: string
  /** As Spotify counts them; null until known (top songs and recent plays, before a copy). */
  songs: number | null
  /** Its songs may go into decks. */
  picked: boolean
  /** Its songs are stored, as of the latest listing. */
  copied: boolean
  /** Its songs are being copied right now. */
  copying: boolean
}

/** The library with its sources, for the library screen. */
export interface LibraryDetails extends Library {
  /** When the sources were last listed, as an ISO time; null before the first listing. */
  refreshed_at: string | null
  sources: Source[]
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

export async function getLibrary(): Promise<LibraryDetails> {
  return (await call('GET', '/api/me/library')).json()
}

/** Pick or unpick sources by id. Picked ones are copied in the background. */
export const pickSources = (changes: Record<string, boolean>) =>
  call('PATCH', '/api/me/sources', changes)

/** List the library again and copy the picked sources that changed. */
export const startImport = () => call('POST', '/api/me/import')
/** The name this player goes by, from now on and in every lobby they sit in. */
export const setName = (name: string) => call('PUT', '/api/me/name', { name })
export const logout = () => call('POST', '/auth/logout')
export const deleteMe = () => call('DELETE', '/api/me')

export const loginUrl = (next: string) => `/auth/login?next=${encodeURIComponent(next)}`
