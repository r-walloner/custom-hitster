import { useEffect } from 'react'
import type { Device } from '../../api/messages.ts'
import { Button, ButtonPair } from '../../components/Button.tsx'
import { Countdown } from '../../components/Countdown.tsx'
import { Icon } from '../../components/Icon.tsx'
import { OptionRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { Verdict } from '../../components/SongCard.tsx'
import { SubHeader } from '../../components/SubHeader.tsx'
import { useRoomTools } from '../room/context.ts'
import { deviceDetail, deviceIcon } from './devices.ts'
import { TEST_SECONDS, useSpeakerTest } from './useSpeakerTest.ts'
import './Playback.css'

/** The speaker: pick a device, play 5 seconds, confirm you heard it. */
export default function Playback() {
  const { room, you, send, devices, playbackTest, close } = useRoomTools()
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const device = mine?.device ?? null
  const shown = device ?? 'your active device'
  const inGame = room.game !== null
  const { test, failure, play, heard, nothing, reset } = useSpeakerTest(playbackTest, send)

  useEffect(() => {
    send({ type: 'get_devices' })
  }, [send])

  const choose = (chosen: Device | null) => {
    send({ type: 'set_device', device_id: chosen?.id ?? null, name: chosen?.name ?? null })
    reset()
  }
  const noLibrary = !mine?.library || mine.library.tracks === 0
  const myFailure = room.playback.failures.find((f) => f.player_id === you.player_id)

  return (
    <Screen>
      <SubHeader
        onBack={close}
        backLabel={inGame ? 'Back to the game' : 'Back to the lobby'}
        title="Where should the music play?"
      >
        <Button onClick={() => send({ type: 'get_devices' })}>
          <Icon name="refresh" />
          Refresh list
        </Button>
      </SubHeader>
      <div className="playback">
        <section className="playback__devices app-scroll" aria-label="Spotify devices">
          {devices === null && <p className="jm-caption">Looking for your Spotify devices…</p>}
          {devices?.map((d) => (
            <OptionRow
              key={d.id}
              icon={deviceIcon(d)}
              name={d.name}
              detail={deviceDetail(d)}
              pressed={d.name === device}
              onClick={() => choose(d)}
            />
          ))}
          {devices !== null && (
            <OptionRow
              icon="music"
              name="Whichever device is active"
              detail="The one Spotify last played on"
              pressed={device === null}
              onClick={() => choose(null)}
            />
          )}
          <p className="jm-caption">
            {devices?.length === 0
              ? 'No devices online. Open Spotify on your speaker, phone or computer, then refresh.'
              : "Don't see your speaker? Play anything on it from Spotify once, then refresh."}
          </p>
        </section>

        <section className="jm-panel playback__test" aria-labelledby="test-head">
          <span className="jm-label">{inGame ? 'Playback' : 'Playback test'}</span>
          {inGame && (
            <>
              <h2 id="test-head" className="jm-headline">
                The next song plays on {shown}.
              </h2>
              <p className="jm-meta">
                {myFailure
                  ? `The song didn't start: ${myFailure.message}`
                  : 'The song playing now stays where it is.'}
              </p>
              {myFailure ? (
                <Button
                  variant="primary"
                  size="xl"
                  className="playback__main"
                  onClick={() => {
                    send({ type: 'retry_playback' })
                    close()
                  }}
                >
                  Play it there now
                </Button>
              ) : (
                <Button variant="primary" size="xl" className="playback__main" onClick={close}>
                  Back to the game
                </Button>
              )}
            </>
          )}
          {!inGame && (test === 'ready' || test === 'sent') && (
            <>
              <h2 id="test-head" className="jm-headline">
                Play 5 seconds on {shown}?
              </h2>
              <p className="jm-meta">
                {noLibrary
                  ? 'The test plays a song from your library. Import your library first.'
                  : 'Turn the volume up. The test plays a song from your library.'}
              </p>
              <Button
                variant="primary"
                size="xl"
                className="playback__main"
                disabled={test === 'sent' || noLibrary}
                onClick={play}
              >
                {test === 'sent' ? 'Starting…' : 'Play a test'}
              </Button>
            </>
          )}
          {!inGame && test === 'playing' && (
            <>
              <div className="playback__listening">
                <Countdown
                  ms={TEST_SECONDS * 1000}
                  total={TEST_SECONDS * 1000}
                  label={(seconds) => `${seconds} seconds of the test left`}
                />
                <div>
                  <h2 id="test-head" className="jm-headline">
                    Can you hear it?
                  </h2>
                  <span className="jm-moment__sub">Playing on {shown}</span>
                </div>
              </div>
              <p className="jm-meta">
                If nothing comes out, check the volume and that Spotify is open on it.
              </p>
              <ButtonPair className="playback__main">
                <Button onClick={nothing}>Nothing</Button>
                <Button variant="primary" onClick={heard}>
                  Yes, I hear it
                </Button>
              </ButtonPair>
            </>
          )}
          {!inGame && test === 'heard' && (
            <>
              <Verdict right>Sound works</Verdict>
              <h2 id="test-head" className="jm-headline">
                {device ?? 'Your active device'} is ready.
              </h2>
              <p className="jm-meta">Every song in this game plays there.</p>
              <Button variant="primary" size="xl" className="playback__main" onClick={close}>
                Use this speaker
              </Button>
            </>
          )}
          {!inGame && test === 'failed' && (
            <>
              <Verdict right={false}>No sound</Verdict>
              <h2 id="test-head" className="jm-headline">
                Nothing came out of {shown}.
              </h2>
              <p className="jm-meta">
                {failure ??
                  'Open Spotify on it so it wakes up, check the volume, then try again. Or pick another speaker.'}
              </p>
              <Button variant="primary" size="xl" className="playback__main" onClick={play}>
                Try again
              </Button>
            </>
          )}
        </section>
      </div>
    </Screen>
  )
}
