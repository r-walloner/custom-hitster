import { useEffect, useState } from 'react'
import type { LibraryDetails } from '../../api/http.ts'
import { newlyImported } from './sources.ts'

/** How long a finished import keeps its full bar before the row shows its song count. */
const FULL_MS = 600

/**
 * The ids of the sources whose import just ended, for a moment. The screen only asks the server
 * every second, so a small playlist can finish between two answers; this way its bar still
 * fills up before it goes.
 */
export function useJustImported(library: LibraryDetails): ReadonlySet<string> {
  const [previous, setPrevious] = useState(library)
  const [finished, setFinished] = useState<ReadonlySet<string>>(new Set())
  if (library !== previous) {
    setPrevious(library)
    const now = newlyImported(previous, library)
    if (now.length) setFinished(new Set([...finished, ...now]))
  }

  useEffect(() => {
    if (finished.size === 0) return
    const timer = window.setTimeout(() => setFinished(new Set()), FULL_MS)
    return () => window.clearTimeout(timer)
  }, [finished])

  return finished
}
