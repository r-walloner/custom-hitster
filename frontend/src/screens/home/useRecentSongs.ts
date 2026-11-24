import { useEffect, useState } from 'react'
import { getRecentSongs } from '../../api/http.ts'
import type { CoverSong } from '../../api/http.ts'

/** How long the cover cards wait for the player's songs before settling on the fixed ones. */
const PATIENCE_MS = 4000

/**
 * The songs for the cover cards, settled once per page load so the titles never switch: the
 * player's recently played songs, `[]` for the fixed ones (logged out, nothing imported yet, a
 * failure or a slow answer), and `null` while that isn't known yet.
 *
 * `loggedIn` is what `/api/me` said, `null` until it answers. The songs are asked for at once,
 * alongside it, so a logged-in player waits for one round trip, not two.
 */
export function useRecentSongs(loggedIn: boolean | null): CoverSong[] | null {
  const [songs, setSongs] = useState<CoverSong[] | null>(null)

  useEffect(() => {
    let settled = false
    const settle = (result: CoverSong[]) => {
      if (settled) return
      settled = true
      setSongs(result)
    }
    getRecentSongs().then(settle, () => settle([]))
    const timer = setTimeout(() => settle([]), PATIENCE_MS)
    return () => {
      settled = true
      clearTimeout(timer)
    }
  }, [])

  // Logged out, also after signing out or deleting the account here, the fixed songs show.
  return loggedIn === false ? [] : songs
}
