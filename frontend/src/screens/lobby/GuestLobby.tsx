import { loginUrl } from '../../api/http.ts'
import { Button, Status } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { InfoHeader } from '../../components/InfoHeader.tsx'
import { PlayerRow, SettingRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { useRoomTools } from '../room/context.ts'
import { libraryStatus, playerStatus } from './status.ts'
import './GuestLobby.css'

/** The lobby as a guest sees it: who's in, waiting for the host, and an optional library. */
export default function GuestLobby() {
  const { room, you, host, player, name, isLocal, isAway, send, open } = useRoomTools()
  const remote = room.settings.mode === 'remote'
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const hostName = host?.name ?? 'The host'

  return (
    <Screen>
      <InfoHeader
        code={room.code}
        host={host?.name}
        players={room.players.length}
        toWin={room.settings.cards_to_win}
      />
      <div className="guest">
        <section className="guest__main">
          <h1 className="jm-moment__headline">You're in, {name(you.player_id)}.</h1>
          <p className="jm-moment__sub">{hostName} starts the game when everyone's ready.</p>
          <div className="guest__players app-scroll">
            {room.players.map((seat) => (
              <PlayerRow
                key={seat.id}
                player={player(seat.id)}
                status={
                  seat.id === you.player_id
                    ? "That's you"
                    : seat.is_host && !remote
                      ? 'Host, plays the music'
                      : playerStatus(seat, isLocal(seat.id))
                }
                you={seat.id === you.player_id}
                away={isAway(seat.id)}
              >
                {seat.id === you.player_id && (
                  <Button
                    variant="bare"
                    size="icon"
                    aria-label="Change your name"
                    onClick={() => open('rename', seat.id)}
                  >
                    <Icon name="edit" />
                  </Button>
                )}
              </PlayerRow>
            ))}
          </div>
          <div className="guest__wait">
            <Status>Waiting for {hostName}</Status>
            <span className="jm-caption">Keep this page open. The game starts here by itself.</span>
            <Button onClick={() => send({ type: 'leave_room' })}>Leave room</Button>
          </div>
        </section>
        {you.spotify ? (
          <aside className="jm-panel guest__bring" aria-labelledby="bring-head">
            <span className="jm-label">Your music</span>
            <h2 id="bring-head" className="jm-headline">
              {libraryStatus(mine?.library ?? null)}
            </h2>
            <p className="jm-meta">
              Songs from your library can turn up in this game's deck. Pick which until the game
              starts.
            </p>
            {remote && (
              <SettingRow
                label="Music plays on"
                value={mine?.device ?? 'Your active Spotify device'}
              >
                <Button onClick={() => open('playback')}>Change</Button>
              </SettingRow>
            )}
            <Button onClick={() => open('library')} className="guest__add">
              <Icon name="music" />
              Choose songs
            </Button>
          </aside>
        ) : (
          <aside className="jm-panel guest__bring" aria-labelledby="bring-head">
            <span className="jm-label">Optional</span>
            <h2 id="bring-head" className="jm-headline">
              Bring your music
            </h2>
            <p className="jm-meta">
              Sign in with Spotify and your saved songs, playlists and top songs can turn up in
              this game's deck.
              {remote && " Everyone hears the songs on their own Spotify in this game, so you'll need it to listen."}
            </p>
            <Button href={loginUrl(`/room/${room.code}`)} variant="primary" className="guest__add">
              <Icon name="music" />
              Add my library
            </Button>
            <p className="jm-caption">Your Spotify account needs the host's approval first.</p>
          </aside>
        )}
      </div>
    </Screen>
  )
}
