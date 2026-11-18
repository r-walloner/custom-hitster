import { useEffect } from 'react'
import type { Library } from '../../api/messages.ts'
import { overallProgress } from './sources.ts'
import { useLibrary } from './useLibrary.ts'

/**
 * The signed-in player's library, and how far its import is (0 to 1; null when nothing
 * imports). `live` is a status kept current elsewhere, such as the room's: when it says an
 * import started, the sources are fetched again, and polled until it ends.
 */
export function useImport(enabled: boolean, live?: Library['status']) {
  const { library, reload } = useLibrary(enabled)

  useEffect(() => {
    if (enabled && live === 'running') reload()
  }, [enabled, live, reload])

  const running = library?.status === 'running' || live === 'running'
  // The bar waits at 0 until the sources tell how far the import is.
  const progress = running ? ((library && overallProgress(library)) ?? 0) : null
  return { library, progress }
}
