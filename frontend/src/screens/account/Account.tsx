import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createRoom, deleteMe, loginUrl, logout, setName, startImport } from '../../api/http.ts'
import { useMe } from '../../api/useMe.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { Button } from '../../components/Button.tsx'
import { Overlay } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { NameDialog } from '../../components/NameDialog.tsx'
import { Header, HeaderMeta, Screen, Spacer } from '../../components/Screen.tsx'
import { Waiting } from '../../components/Waiting.tsx'
import { ago } from '../../words.ts'
import { Listing, NotImported, Picker } from './components/LibraryPanel.tsx'
import DeleteAccount from './DeleteAccount.tsx'
import { useLibrary } from './useLibrary.ts'
import './Account.css'

/** Account and library: your library's state, host or join, and your data. */
export default function Account() {
  const navigate = useNavigate()
  const { me, failed, refresh } = useMe()
  // Listing and copying run on the server; the hook polls while they do.
  const { library, failed: libraryFailed, pick, reload } = useLibrary(!!me?.spotify)
  const [problem, setProblem] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const importing = library?.status === 'running'

  // Signed out: this page is the way in, so go and sign in with Spotify.
  useEffect(() => {
    if (me && !me.spotify) location.assign(loginUrl('/account'))
  }, [me])

  if (failed || libraryFailed)
    return <Waiting text="The server can't be reached. Reload to try again." />
  if (!me?.spotify) return <Waiting text="Signing in with Spotify…" />
  const { spotify } = me

  const act = (action: () => Promise<unknown>, what: string) =>
    action().then(refresh, () => setProblem(`${what} didn't work. Try again.`))

  const host = () =>
    createRoom().then(
      (code) => navigate(`/room/${code}`),
      () => setProblem("Couldn't open a room. Try again."),
    )
  const forget = () => {
    setDeleting(false)
    deleteMe().then(
      () => navigate('/'),
      () => setProblem("Deleting didn't work. Try again."),
    )
  }
  const signOut = () => logout().then(() => navigate('/'))
  const startReading = (what: string) =>
    startImport().then(reload, () => setProblem(`${what} didn't work. Try again.`))
  const choose = (changes: Record<string, boolean>) =>
    pick(changes).catch(() => setProblem("Changing what goes in the deck didn't work. Try again."))
  const rename = (name: string) => {
    setRenaming(false)
    if (name !== spotify.name) act(() => setName(name), 'Changing your name')
  }

  const screen = (
    <Screen>
      <Header>
        <Logo />
        <Spacer />
        <Avatar player={{ name: spotify.name, color: 1 }} size="lg" />
        <HeaderMeta>
          <b>{spotify.name}</b>
          <span>via Spotify</span>
        </HeaderMeta>
        <Button
          variant="bare"
          size="icon"
          aria-label="Change your name"
          onClick={() => setRenaming(true)}
        >
          <Icon name="edit" />
        </Button>
        <Button onClick={signOut}>
          <Icon name="signOut" />
          Sign out
        </Button>
      </Header>
      <div className="account">
        {library?.sources.length ? (
          <Picker library={library} onPick={choose} />
        ) : !library || library.status === 'running' ? (
          <Listing />
        ) : (
          <NotImported
            problem={library.status === 'error' ? library.detail : undefined}
            onImport={() => startReading('Importing your library')}
          />
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
              {library?.refreshed_at ? `Library imported ${ago(library.refreshed_at)}.` : 'Not copied yet.'}
            </p>
            <Button disabled={importing} onClick={() => startReading('Refreshing your library')}>
              <Icon name="refresh" />
              Refresh library
            </Button>
            <Button className="app-btn--danger" onClick={() => setDeleting(true)}>
              <Icon name="trash" />
              Delete my account
            </Button>
          </section>
        </aside>
      </div>
    </Screen>
  )

  return (
    <Overlay under={screen}>
      {renaming && (
        <NameDialog
          title="Change your name"
          initial={spotify.name}
          color={1}
          submitLabel={() => 'Save'}
          onSubmit={rename}
          onClose={() => setRenaming(false)}
        />
      )}
      {deleting && <DeleteAccount onDelete={forget} onClose={() => setDeleting(false)} />}
    </Overlay>
  )
}
