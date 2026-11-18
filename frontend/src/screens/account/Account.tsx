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
import { Imported, Importing, NotImported } from './components/LibraryPanel.tsx'
import './Account.css'

/** Account and library: your library's state, host or join, and your data. */
export default function Account() {
  const navigate = useNavigate()
  // The import runs on the server; poll while it does.
  const { me, failed, refresh } = useMe((loaded) => loaded.spotify?.library.status === 'running')
  const [problem, setProblem] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const importing = me?.spotify?.library.status === 'running'

  // Signed out: this page is the way in, so go and sign in with Spotify.
  useEffect(() => {
    if (me && !me.spotify) location.assign(loginUrl('/account'))
  }, [me])

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />
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
    if (!window.confirm("Delete your copy of your Spotify library and your login from Jamster?"))
      return
    deleteMe().then(
      () => navigate('/'),
      () => setProblem("Deleting didn't work. Try again."),
    )
  }
  const signOut = () => logout().then(() => navigate('/'))
  const { library } = spotify
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
    </Overlay>
  )
}
