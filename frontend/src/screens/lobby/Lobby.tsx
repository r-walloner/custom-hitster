import { useState } from 'react'
import { loginUrl } from '../../api/http.ts'
import { Button, Status } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { ImportProgress } from '../../components/ImportProgress.tsx'
import { QrTile } from '../../components/Input.tsx'
import { Logo } from '../../components/Logo.tsx'
import { PlayerRow, SettingRow } from '../../components/Rows.tsx'
import { Header, RoomMeta, Screen, Spacer } from '../../components/Screen.tsx'
import { ScrollArea } from '../../components/ScrollArea.tsx'
import { plural } from '../../words.ts'
import { useImport } from '../library/useImport.ts'
import { useRoomTools } from '../room/context.ts'
import { playerStatus, songCount } from './status.ts'
import './Lobby.css'

/**
 * The lobby: getting people in, who's in, and setup. The host changes the setup and starts the
 * game; a guest sees the same screen, views the rules and waits for the host.
 */
export default function Lobby() {
  const { room, you, host, player, isLocal, send, open, toast } = useRoomTools()
  const { settings, deck } = room
  const isHost = you.is_host
  const remote = settings.mode === 'remote'
  const link = `${location.origin}/room/${room.code}`
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const hostName = host?.name ?? 'The host'
  const [closing, setClosing] = useState(false)
  const { progress } = useImport(you.spotify, mine?.library?.status)

  // Where this player hears it: their own speaker, or with one speaker the host's.
  const speaker =
    remote || isHost
      ? (mine?.device ?? 'Your active Spotify device')
      : (host?.device ?? `${hostName}'s active Spotify device`)

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
          host={host?.name ?? (isHost ? 'Your' : 'The host')}
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

        <section
          className="lobby__players app-scroll"
          aria-labelledby="players-head"
        >
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
                {/* Rename your own seat; the host removes the others. A local player with the
                    wrong name is removed and added again. */}
                <span className="lobby__action">
                  {seat.id === you.player_id ? (
                    <Button
                      variant="bare"
                      size="icon"
                      aria-label="Change your name"
                      onClick={() => open('rename', seat.id)}
                    >
                      <Icon name="edit" />
                    </Button>
                  ) : (
                    isHost && (
                      <Button
                        variant="bare"
                        size="icon"
                        aria-label={`Remove ${seat.name}`}
                        onClick={() => send({ type: 'remove_player', player_id: seat.id })}
                      >
                        <Icon name="close" />
                      </Button>
                    )
                  )}
                </span>
              </PlayerRow>
            )
          })}
          {isHost && (
            <Button onClick={() => open('addPlayer')} className="lobby__add">
              <Icon name="plus" />
              Add local player
            </Button>
          )}
        </section>

        <aside className="lobby__setup">
          <section className="jm-panel lobby__rules" aria-label="Game setup">
            {/* On a short screen the rows scroll and the buttons below stay put. */}
            <ScrollArea className="lobby__rules-rows">
              <SettingRow
                label="Music plays on"
                value={speaker}
              >
                {/* The speaker screen lists your own Spotify devices, so it needs Spotify. */}
                {you.spotify && <Button onClick={() => open('playback')}>Change</Button>}
              </SettingRow>
              {you.spotify ? (
                <SettingRow
                  label="Your songs"
                  value={
                    progress !== null ? (
                      <ImportProgress value={progress} strong />
                    ) : (
                      songCount(mine?.library ?? null)
                    )
                  }
                >
                  <Button onClick={() => open('library')}>Change</Button>
                </SettingRow>
              ) : (
                <SettingRow
                  label="Your songs"
                  value="Not signed in"
                >
                  <Button href={loginUrl(`/room/${room.code}`)}>Sign in</Button>
                </SettingRow>
              )}
              <SettingRow
                label="Rules"
                value={`First to ${plural(settings.cards_to_win, 'card')}`}
              >
                <Button onClick={() => open('settings')}>{isHost ? 'Change' : 'View'}</Button>
              </SettingRow>
            </ScrollArea>
          </section>
          {isHost && deck.status === 'error' && (
            <p className="jm-caption" role="alert">
              {deck.error ?? 'Starting the game failed.'} Try again, or change the setup.
            </p>
          )}
          {isHost ? (
            <>
              <Button
                className="app-btn--danger lobby__leave"
                onClick={() => (closing ? send({ type: 'close_room' }) : setClosing(true))}
              >
                {closing ? 'Tap again to close it for everyone' : 'Close room'}
              </Button>
              <Button
                variant="primary"
                size="xl"
                disabled={deck.status === 'dealing'}
                onClick={() => send({ type: 'start_game' })}
              >
                Start game
              </Button>
            </>
          ) : (
            <>
              <Button className="lobby__leave" onClick={() => send({ type: 'leave_room' })}>
                Leave room
              </Button>
              <div className="lobby__wait" role="status">
                <Status>Waiting for {hostName}</Status>
                <span className="jm-caption">{hostName} starts the game when everyone's ready.</span>
              </div>
            </>
          )}
        </aside>
      </div>
    </Screen>
  )
}
