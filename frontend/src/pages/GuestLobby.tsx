import { Button, RoomCode, Status } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { Logo } from '../components/Logo.tsx'
import { PlayerRow } from '../components/Rows.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { JONAS, LEA, MARA, SAM } from '../fixtures.ts'
import { useRoomPaths } from '../paths.ts'
import './GuestLobby.css'

/** The lobby as a guest sees it: who's in, waiting for the host, and an optional library. */
export default function GuestLobby() {
  const paths = useRoomPaths()
  return (
    <Screen>
      <Header>
        <Logo />
        <RoomCode code={paths.code} />
        <Spacer />
        <RoomMeta host="Mara" players={4} />
      </Header>
      <div className="guest">
        <section className="guest__main">
          <h1 className="jm-moment__headline">You're in, Jonas.</h1>
          <p className="jm-moment__sub">Mara starts the game when everyone's ready.</p>
          <div className="guest__players">
            <PlayerRow player={MARA} status="Host, plays the music" />
            <PlayerRow player={SAM} status="Brings a library" />
            <PlayerRow player={LEA} status="Guest" />
            <PlayerRow player={JONAS} status="That's you" you />
          </div>
          <div className="guest__wait">
            <Status>Waiting for Mara</Status>
            <span className="jm-caption">Keep this page open. The game starts here by itself.</span>
            <Button to="/">Leave room</Button>
          </div>
        </section>
        <aside className="jm-panel guest__bring" aria-labelledby="bring-head">
          <span className="jm-label">Optional</span>
          <h2 id="bring-head" className="jm-headline">
            Bring your music
          </h2>
          <p className="jm-meta">
            Sign in with Spotify and your saved songs, playlists and top songs can turn up in this
            game's deck.
          </p>
          <Button to="/account" variant="primary" className="guest__add">
            <Icon name="music" />
            Add my library
          </Button>
          <p className="jm-caption">
            3 of 5 Spotify spots left. Your account needs the host's approval.
          </p>
        </aside>
      </div>
    </Screen>
  )
}
