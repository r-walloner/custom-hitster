import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { loginUrl } from '../../api/http.ts'
import { useMe } from '../../api/useMe.ts'
import { Waiting } from '../../components/Waiting.tsx'
import Library from './Library.tsx'

/** `/library`: the library screen outside a room, back to Home. */
export default function LibraryPage() {
  const navigate = useNavigate()
  const { me, failed } = useMe()

  // Signed out: there's no library to show, so go and sign in with Spotify.
  useEffect(() => {
    if (me && !me.spotify) location.assign(loginUrl('/library'))
  }, [me])

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />
  if (!me?.spotify) return <Waiting text="Signing in with Spotify…" />
  return <Library onBack={() => navigate('/')} backLabel="Back to the start" />
}
