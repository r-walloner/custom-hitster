import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { QrTile } from '../components/Input.tsx'
import { Logo } from '../components/Logo.tsx'
import { PlayerRow, SettingRow } from '../components/Rows.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../components/Screen.tsx'
import { names, playerStatus, plural, useRoomTools } from '../room.ts'
import './Lobby.css'

/** The host's lobby: getting people in, who's in, and setup with Start game. */
export default function Lobby() {
  const { room, you, host, player, isLocal, send, open, toast } = useRoomTools()
  const { settings, deck } = room
  const remote = settings.mode === 'remote'
  const link = `${location.origin}/room/${room.code}`
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const silent = remote ? room.players.filter((seat) => !seat.spotify) : []

  // The clipboard API only exists on HTTPS and on 127.0.0.1.
  const copy = () =>
    navigator.clipboard
      .writeText(link)
      .then(() => toast('right', 'Invite link copied.'))
      .catch(() => toast('wrong', "Couldn't copy the link. Share the code instead."))

  return (
    <Screen>
      <Header>
        <Logo />
        <Spacer />
        <RoomMeta
          host={host?.name ?? 'Your'}
          players={room.players.length}
          toWin={settings.cards_to_win}
        />
      </Header>
      <div className="lobby">
        <section className="jm-panel lobby__invite" aria-labelledby="code-label">
          <span id="code-label" className="jm-label">
            Room code
          </span>
          <span className="lobby__code">{room.code}</span>
          <p className="jm-caption">Type in the code, scan it or copy the link.</p>
          <QrTile value={link} label={`QR code to join room ${room.code}`} />
          {navigator.clipboard && (
            <Button variant="primary" className="lobby__copy" onClick={copy}>
              <Icon name="link" />
              Copy invite link
            </Button>
          )}
        </section>

        <section className="lobby__players app-scroll" aria-labelledby="players-head">
          <h1 id="players-head" className="jm-section">
            Players
          </h1>
          {room.players.map((seat) => {
            const local = isLocal(seat.id)
            const music = remote ? seat.spotify : seat.is_host
            return (
              <PlayerRow
                key={seat.id}
                player={player(seat.id)}
                status={playerStatus(seat, local)}
                away={!seat.connected && !local}
              >
                {music && (
                  <span className="lobby__music">
                    <Icon name="speaker" size={13} />
                    Music
                  </span>
                )}
                {!seat.is_host && (
                  <Button
                    variant="bare"
                    size="icon"
                    aria-label={`Remove ${seat.name}`}
                    onClick={() => send({ type: 'remove_player', player_id: seat.id })}
                  >
                    <Icon name="close" />
                  </Button>
                )}
              </PlayerRow>
            )
          })}
          <Button onClick={() => open('addPlayer')} className="lobby__add">
            <Icon name="plus" />
            Add local player
          </Button>
        </section>

        <aside className="lobby__setup">
          <section className="jm-panel lobby__rules" aria-label="Game setup">
            <SettingRow
              label="Music plays on"
              value={remote ? "Everyone's own Spotify" : (mine?.device ?? 'Your active Spotify device')}
              caption={
                silent.length > 0
                  ? `Without Spotify, ${names(silent.map((seat) => seat.name))} won't hear it.`
                  : remote
                    ? `Yours: ${mine?.device ?? 'your active device'}`
                    : undefined
              }
            >
              <Button onClick={() => open('speaker')}>Change</Button>
            </SettingRow>
            <SettingRow
              label="Rules"
              value={`First to ${plural(settings.cards_to_win, 'card')}`}
              caption={`${plural(settings.starting_tokens, 'token')} each, ${settings.challenge_seconds} s to challenge, ${plural(settings.deck_size, 'song')}`}
            >
              <Button onClick={() => open('settings')}>Change</Button>
            </SettingRow>
          </section>
          {deck.status === 'error' && (
            <p className="jm-caption" role="alert">
              {deck.error ?? 'Starting the game failed.'} Try again, or change the setup.
            </p>
          )}
          <Button to="/" className="app-btn--danger lobby__close">
            Leave room
          </Button>
          <Button
            variant="primary"
            size="xl"
            disabled={deck.status === 'dealing'}
            onClick={() => send({ type: 'start_game' })}
          >
            Start game
          </Button>
        </aside>
      </div>
    </Screen>
  )
}
