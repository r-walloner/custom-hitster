import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { createRoom, deleteMe, loginUrl, logout, setName } from '../../api/http.ts'
import type { Me } from '../../api/http.ts'
import { useMe } from '../../api/useMe.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { Button } from '../../components/Button.tsx'
import { CoverScreen } from '../../components/CoverScreen.tsx'
import { Overlay } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { CodeInput } from '../../components/Input.tsx'
import { NameDialog } from '../../components/NameDialog.tsx'
import { ImportProgress } from '../../components/ImportProgress.tsx'
import { useImport } from '../library/useImport.ts'
import AccountDialog from './AccountDialog.tsx'
import DeleteAccount from './DeleteAccount.tsx'
import { SignInError } from './SignInError.tsx'
import { songsLabel, songsNote } from './songs.ts'
import './Home.css'

/**
 * Home, the one menu outside a room: join with the four-letter code, and log in with Spotify.
 * Logged in, it also hosts, opens your songs and your account. `?error=` shows the sign-in error.
 */
export default function Home() {
  const [params] = useSearchParams()
  const error = params.get('error')
  if (error !== null) return <SignInError reason={error} />
  return <JoinOrHost />
}

type Pop = 'account' | 'rename' | 'delete'

function JoinOrHost() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  // Until /api/me answers, or if it fails, this is the logged-out page: joining needs nothing.
  const { me, refresh } = useMe()
  const spotify = me?.spotify ?? null
  // The sources too, polled while they import, for the bar on Your songs.
  const { library: details, progress } = useImport(!!spotify)
  const library = details ?? spotify?.library
  const [pop, setPop] = useState<Pop | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const letters = code.trim().toUpperCase()
  const join = (event: FormEvent) => {
    event.preventDefault()
    if (letters.length === 4) navigate(`/room/${letters}`)
  }

  const host = () =>
    createRoom().then(
      (room) => navigate(`/room/${room}`),
      () => setProblem("Couldn't open a room. Try again."),
    )
  const signOut = () => {
    setPop(null)
    logout().then(refresh, () => setProblem("Signing out didn't work. Try again."))
  }
  const forget = () => {
    setPop(null)
    deleteMe().then(refresh, () => setProblem("Deleting didn't work. Try again."))
  }
  const rename = (name: string) => {
    setPop(null)
    if (spotify && name !== spotify.name)
      setName(name).then(refresh, () => setProblem("Changing your name didn't work. Try again."))
  }

  const screen = (
    <CoverScreen>
      <form className={`jm-panel app-cover__panel${spotify ? ' home--in' : ''}`} onSubmit={join}>
        {spotify && <You spotify={spotify} onAccount={() => setPop('account')} />}
        <label className="jm-label" htmlFor="room-code">
          Room code
        </label>
        <div className="home__join">
          <CodeInput
            id="room-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="ABCD"
          />
          <Button type="submit" variant="primary" disabled={letters.length !== 4}>
            Join
          </Button>
        </div>
        {!spotify && (
          <p className="jm-caption">No account needed. Ask the host for the four letters.</p>
        )}
        <div className="home__or">
          <span className="jm-caption">or</span>
        </div>
        {spotify ? (
          <>
            <Button variant="primary" className="app-cover__big-btn" onClick={host}>
              Host a game
            </Button>
            <Button to="/library" className="app-cover__big-btn home__songs">
              <Icon name="music" />
              {songsLabel(library ?? spotify.library)}
              {progress !== null ? (
                <ImportProgress value={progress} className="home__importing" />
              ) : (
                <span className="home__note">{songsNote(library ?? spotify.library)}</span>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button href={loginUrl('/')} className="app-cover__big-btn">
              <Icon name="music" />
              Log in with Spotify
            </Button>
            <p className="jm-caption">
              Hosting needs Spotify Premium. Private, for one group of friends.
            </p>
          </>
        )}
        {problem && (
          <p className="jm-caption" role="alert">
            {problem}
          </p>
        )}
      </form>
    </CoverScreen>
  )

  return (
    <Overlay under={screen}>
      {spotify && pop === 'account' && (
        <AccountDialog
          name={spotify.name}
          onRename={() => setPop('rename')}
          onSignOut={signOut}
          onDelete={() => setPop('delete')}
          onClose={() => setPop(null)}
        />
      )}
      {spotify && pop === 'rename' && (
        <NameDialog
          title="Change your name"
          initial={spotify.name}
          color={1}
          submitLabel={() => 'Save'}
          onSubmit={rename}
          onClose={() => setPop('account')}
        />
      )}
      {pop === 'delete' && <DeleteAccount onDelete={forget} onClose={() => setPop('account')} />}
    </Overlay>
  )
}

/** Who is logged in, at the top of the panel, with the way to their account. */
function You({
  spotify,
  onAccount,
}: {
  spotify: NonNullable<Me['spotify']>
  onAccount: () => void
}) {
  return (
    <div className="home__you">
      <Avatar player={{ name: spotify.name, color: 1 }} size="lg" />
      <span className="home__name">
        <b>{spotify.name}</b>
        <span className="jm-caption">via Spotify</span>
      </span>
      <Button onClick={onAccount}>Account</Button>
    </div>
  )
}
