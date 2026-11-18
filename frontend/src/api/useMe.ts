import { useCallback, useEffect, useState } from 'react'
import { getMe } from './http.ts'
import type { Me } from './http.ts'

/**
 * Who this browser is (`/api/me`). Fetching it also sets the session cookie the room socket needs.
 */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true
    const load = () =>
      getMe().then(
        (result) => current && setMe(result),
        () => current && setFailed(true),
      )
    load()
    return () => {
      current = false
    }
  }, [])

  const refresh = useCallback(() => getMe().then(setMe), [])
  return { me, failed, refresh }
}
