import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { createRoom, deleteMe, getMe, loginUrl, logout, startImport } from '../api.ts'
import type { Me } from '../api.ts'
import { LibraryStatus } from '../components/LibraryStatus.tsx'

const LOGIN_ERRORS: Record<string, string> = {
  cancelled: 'The Spotify sign-in was cancelled.',
  not_allowed:
    'This Spotify account is not on the allowlist yet. The owner has to add it in the Spotify developer dashboard.',
  spotify: 'The Spotify sign-in failed. Try again.',
}

export default function Home() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)
  const [code, setCode] = useState('')
  const loginError = LOGIN_ERRORS[params.get('error') ?? '']
  const spotify = me?.spotify ?? null
  const importing = spotify?.library.status === 'running'

  useEffect(() => {
    let current = true
    const load = () =>
      getMe().then(
        (result) => current && setMe(result),
        () => current && setFailed(true),
      )
    load()
    // The import runs on the server; poll while it does.
    const timer = importing ? window.setInterval(load, 2000) : undefined
    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [importing])

  const refresh = () => getMe().then(setMe)

  const join = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim()) navigate(`/room/${code.trim().toUpperCase()}`)
  }

  const forget = async () => {
    if (!window.confirm('Delete your Spotify login and imported library from this server?')) return
    await deleteMe()
    await refresh()
  }

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>Jamster</h1>
        <p>Hear a song, guess when it came out, build the longest timeline.</p>
      </header>

      {loginError && <p className="banner bad">{loginError}</p>}
      {failed && <p className="banner bad">The server cannot be reached.</p>}

      <section className="panel">
        <h2>Join a room</h2>
        <form className="row" onSubmit={join}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Room code"
            maxLength={4}
            autoCapitalize="characters"
            aria-label="Room code"
          />
          <button type="submit" disabled={!code.trim()}>
            Join
          </button>
        </form>
      </section>

      {me && !spotify && (
        <section className="panel">
          <h2>Host a game</h2>
          <p className="muted">
            Sign in with Spotify to host, and to add your music to the decks of rooms you join.
          </p>
          <a className="button primary" href={loginUrl('/')}>
            Sign in with Spotify
          </a>
        </section>
      )}

      {spotify && (
        <section className="panel">
          <h2>Signed in as {spotify.name}</h2>
          <LibraryStatus library={spotify.library} />
          <div className="row wrap">
            <button
              className="primary"
              onClick={async () => navigate(`/room/${await createRoom()}`)}
            >
              Create a room
            </button>
            <button disabled={importing} onClick={() => startImport().then(refresh)}>
              {spotify.library.status === 'none' ? 'Import library' : 'Re-import library'}
            </button>
            <button onClick={() => logout().then(refresh)}>Sign out</button>
            <button className="danger" onClick={forget}>
              Delete my data
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
