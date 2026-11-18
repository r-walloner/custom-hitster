import { useCallback, useEffect, useState } from 'react'
import { getMe } from './http.ts'
import type { Me } from './http.ts'

const POLL_MS = 2000

/**
 * Who this browser is (`/api/me`). Fetching it also sets the session cookie the room socket needs.
 * While `poll(me)` holds, it asks again every 2 seconds.
 */
export function useMe(poll?: (me: Me) => boolean) {
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)
  const polling = me !== null && !!poll?.(me)

  useEffect(() => {
    let current = true
    const load = () =>
      getMe().then(
        (result) => current && setMe(result),
        () => current && setFailed(true),
      )
    load()
    const timer = polling ? window.setInterval(load, POLL_MS) : undefined
    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [polling])

  const refresh = useCallback(() => getMe().then(setMe), [])
  return { me, failed, refresh }
}
