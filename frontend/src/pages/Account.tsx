import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createRoom, deleteMe, getMe, loginUrl, logout, startImport } from '../api.ts'
import type { Me } from '../api.ts'
import { Avatar } from '../components/Avatar.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { Logo } from '../components/Logo.tsx'
import { Progress } from '../components/Progress.tsx'
import { Header, HeaderMeta, Screen, Spacer } from '../components/Screen.tsx'
import type { Library } from '../messages.ts'
import { plural } from '../room.ts'
import { Waiting } from './Waiting.tsx'
import './Account.css'

const POLL_MS = 2000

/** Account and library: your library's state, host or join, and your data. */
export default function Account() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const importing = me?.spotify?.library.status === 'running'

  useEffect(() => {
    let current = true
    const load = () =>
      getMe().then(
        (result) => current && setMe(result),
        () => current && setFailed(true),
      )
    load()
    // The import runs on the server; poll while it does.
    const timer = importing ? window.setInterval(load, POLL_MS) : undefined
    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [importing])

  // Signed out: this page is the way in, so go and sign in with Spotify.
  useEffect(() => {
    if (me && !me.spotify) location.assign(loginUrl('/account'))
  }, [me])

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />
  if (!me?.spotify) return <Waiting text="Signing in with Spotify…" />
  const { spotify } = me

  const refresh = () => getMe().then(setMe)
  const act = (action: () => Promise<unknown>, what: string) =>
    action().then(refresh, () => setProblem(`${what} didn't work. Try again.`))

  const host = () =>
    createRoom().then(
      (code) => navigate(`/room/${code}`),
      () => setProblem("Couldn't open a room. Try again."),
    )
  const forget = () => {
    if (!window.confirm("Delete your copy of your Spotify library and your login from Jamster?"))
      return
    deleteMe().then(
      () => navigate('/'),
      () => setProblem("Deleting didn't work. Try again."),
    )
  }
  const signOut = () => logout().then(() => navigate('/'))
  const { library } = spotify

  return (
    <Screen>
      <Header>
        <Logo />
        <Spacer />
        <Avatar player={{ name: spotify.name, color: 1 }} size="lg" />
        <HeaderMeta>
          <b>{spotify.name}</b>
          <span>Spotify</span>
        </HeaderMeta>
        <Button onClick={signOut}>
          <Icon name="signOut" />
          Sign out
        </Button>
      </Header>
      <div className="account">
        {library.status === 'running' ? (
          <Importing library={library} />
        ) : library.status === 'none' ? (
          <NotImported onImport={() => act(startImport, 'Starting the import')} />
        ) : (
          <Imported library={library} />
        )}
        <aside className="account__side">
          <Button variant="primary" size="xl" className="account__host" onClick={host}>
            Host a game
          </Button>
          <Button to="/" className="account__join">
            Join a room
          </Button>
          {problem && (
            <p className="jm-caption" role="alert">
              {problem}
            </p>
          )}
          <section className="account__data" aria-labelledby="data-head">
            <h2 id="data-head" className="jm-section">
              Your data
            </h2>
            <p className="jm-caption">
              Jamster keeps a copy of your library. Deleting it doesn't touch your Spotify account.
            </p>
            <Button disabled={importing} onClick={() => act(startImport, 'Re-importing')}>
              <Icon name="refresh" />
              Re-import
            </Button>
            <Button className="app-btn--danger" onClick={forget}>
              <Icon name="trash" />
              Delete my copy
            </Button>
          </section>
        </aside>
      </div>
    </Screen>
  )
}

/**
 * The library is in. The design picks playlists and artists here, but the backend has no notion of
 * sources yet (a backend TODO in README.md), so this shows what was copied.
 */
function Imported({ library }: { library: Library }) {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        {library.status === 'error'
          ? `The import stopped. ${plural(library.tracks, 'song')} kept.`
          : `${plural(library.tracks, 'song')} ${library.tracks === 1 ? 'is' : 'are'} in.`}
      </h1>
      <p className="jm-meta account__intro">
        {library.status === 'error'
          ? `${library.detail} Re-import to try again.`
          : 'Your liked songs, your playlists, your top songs and what you played lately. Songs from all of them can turn up in the decks of the rooms you play in.'}
      </p>
    </section>
  )
}

function Importing({ library }: { library: Library }) {
  // The importer reports "Saved tracks: 812 of 1940" and the like.
  const step = /(\d+) of (\d+)/.exec(library.detail)
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Copying your library…
      </h1>
      {step && (
        <Progress value={Number(step[1])} max={Number(step[2]) || 1} label="Import progress" />
      )}
      <p className="jm-meta">
        <b className="account__strong">{plural(library.tracks, 'song')} so far</b>,{' '}
        {library.detail.charAt(0).toLowerCase() + library.detail.slice(1)}
      </p>
      <p className="jm-caption">Join or host a game meanwhile if you like.</p>
    </section>
  )
}

function NotImported({ onImport }: { onImport: () => void }) {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Your library isn't in yet.
      </h1>
      <p className="jm-meta account__intro">
        We copy your liked songs, playlists and top songs. Songs from them turn up in the decks of
        the rooms you play in.
      </p>
      <div className="account__start">
        <Button variant="primary" className="account__import" onClick={onImport}>
          Import my library
        </Button>
        <span className="jm-caption">Takes a minute or two.</span>
      </div>
    </section>
  )
}
