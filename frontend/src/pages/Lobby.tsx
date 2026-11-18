import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { QrTile } from '../components/Input.tsx'
import { Logo } from '../components/Logo.tsx'
import { PlayerRow, SettingRow } from '../components/Rows.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { JONAS, LEA, MARA, SAM, SPEAKER } from '../fixtures.ts'
import type { Player } from '../fixtures.ts'
import { useRoomPaths } from '../paths.ts'
import './Lobby.css'

function Remove({ player }: { player: Player }) {
  return (
    <Button variant="bare" size="icon" aria-label={`Remove ${player.name}`}>
      <Icon name="close" />
    </Button>
  )
}

/** The host's lobby: getting people in, who's in, and setup with Start game. */
export default function Lobby() {
  const paths = useRoomPaths()
  return (
    <Screen>
      <Header>
        <Logo />
        <Spacer />
        <RoomMeta host="Mara" players={4} />
      </Header>
      <div className="lobby">
        <section className="jm-panel lobby__invite" aria-labelledby="code-label">
          <span id="code-label" className="jm-label">
            Room code
          </span>
          <span className="lobby__code">{paths.code}</span>
          <p className="jm-caption">Type in the code, scan it or copy the link.</p>
          <QrTile label={`QR code to join room ${paths.code}`} />
          <Button variant="primary" className="lobby__copy">
            <Icon name="link" />
            Copy invite link
          </Button>
        </section>

        <section className="lobby__players" aria-labelledby="players-head">
          <h1 id="players-head" className="jm-section">
            Players
          </h1>
          <PlayerRow player={MARA} status="Host, 1,940 songs in library">
            <span className="lobby__music">
              <Icon name="speaker" size={13} />
              Music
            </span>
          </PlayerRow>
          <PlayerRow player={SAM} status="Importing library, 42%">
            <Remove player={SAM} />
          </PlayerRow>
          <PlayerRow player={LEA} status="Guest, reconnecting…" away>
            <Remove player={LEA} />
          </PlayerRow>
          <PlayerRow player={JONAS} status="Local player">
            <Remove player={JONAS} />
          </PlayerRow>
          <Button to={paths.addPlayer} className="lobby__add">
            <Icon name="plus" />
            Add local player
          </Button>
        </section>

        <aside className="lobby__setup">
          <section className="jm-panel lobby__rules" aria-label="Game setup">
            <SettingRow label="Music plays on" value={SPEAKER}>
              <Button to={paths.speaker}>Change</Button>
            </SettingRow>
            <SettingRow
              label="Rules"
              value="First to 10 cards"
              caption="2 tokens each, 20 s to challenge, 120 songs"
            >
              <Button to={paths.settings}>Change</Button>
            </SettingRow>
          </section>
          <Button to="/" className="app-btn--danger lobby__close">
            Close room
          </Button>
          <Button to={paths.dealing} variant="primary" size="xl">
            Start game
          </Button>
        </aside>
      </div>
    </Screen>
  )
}
