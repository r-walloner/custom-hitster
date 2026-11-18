import { useCallback, useEffect, useRef, useState } from 'react'
import { getLibrary, pickSources } from '../../api/http.ts'
import type { LibraryDetails } from '../../api/http.ts'

const POLL_MS = 1000

/**
 * The signed-in player's library and its sources (`/api/me/library`), polled while the server
 * lists or copies. `pick` shows a tick at once and then tells the server.
 */
export function useLibrary(enabled: boolean) {
  const [library, setLibrary] = useState<LibraryDetails | null>(null)
  const [failed, setFailed] = useState(false)
  // Bumped by every pick, so an answer that left before it can't undo the tick on screen.
  const picks = useRef(0)
  const polling = library?.status === 'running'

  const load = useCallback(() => {
    const asked = picks.current
    return getLibrary().then(
      (loaded) => {
        if (asked === picks.current) setLibrary(loaded)
      },
      () => setFailed(true),
    )
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
    const timer = polling ? window.setInterval(load, POLL_MS) : undefined
    return () => window.clearInterval(timer)
  }, [enabled, polling, load])

  const pick = useCallback(
    (changes: Record<string, boolean>) => {
      picks.current += 1
      setLibrary((current) => current && withPicks(current, changes))
      // Worked or not, show what the server now has.
      return pickSources(changes).finally(() => {
        picks.current += 1
        load()
      })
    },
    [load],
  )

  return { library, failed, pick, reload: load }
}

/** `library` with these sources picked or unpicked, as the server will soon report it. */
function withPicks(library: LibraryDetails, changes: Record<string, boolean>): LibraryDetails {
  const sources = library.sources.map((source) =>
    source.id in changes
      ? { ...source, picked: changes[source.id], copying: source.copying && changes[source.id] }
      : source,
  )
  const copying = sources.some((source) => source.picked && !source.copied)
  return { ...library, sources, status: copying ? 'running' : library.status }
}
