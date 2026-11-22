import { useEffect } from 'react'
import type { Device } from '../../api/messages.ts'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { DoneButton } from '../../components/DoneButton.tsx'
import { Icon } from '../../components/Icon.tsx'
import { OptionRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { ScrollArea } from '../../components/ScrollArea.tsx'
import { useRoomTools } from '../room/context.ts'
import { deviceDetail, deviceIcon, MODES } from './devices.ts'
import { TEST_SECONDS, useSpeakerTest } from './useSpeakerTest.ts'
import './Playback.css'

/** How the room hears the music, and your speaker: pick one, tap Test to hear a song on it. */
export default function Playback() {
  const { room, you, send, devices, playbackTest, close } = useRoomTools()
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const device = mine?.device ?? null
  const inGame = room.game !== null
  const { test, failure, toggle, reset } = useSpeakerTest(playbackTest, send)

  useEffect(() => {
    send({ type: 'get_devices' })
  }, [send])

  const choose = (chosen: Device | null) => {
    send({ type: 'set_device', device_id: chosen?.id ?? null, name: chosen?.name ?? null })
    reset()
  }
  const noLibrary = !mine?.library || mine.library.tracks === 0
  const myFailure = room.playback.failures.find((f) => f.player_id === you.player_id)
  const mode = MODES.find((m) => m.mode === room.settings.mode) ?? MODES[0]

  // The test plays a song, so it is only offered before the game, on the picked speaker.
  const testLine = inGame ? null : (
    <>
      <Button
        className="playback__test"
        aria-pressed={test !== 'idle'}
        disabled={noLibrary}
        onClick={toggle}
      >
        <Icon name={test === 'idle' ? 'speaker' : 'speakerOff'} />
        {test === 'idle' ? 'Test' : 'Stop'}
      </Button>
      <span className={failure ? 'jm-caption playback__failure' : 'jm-caption'}>
        {noLibrary
          ? 'Pick your songs first: the test plays one of them.'
          : (failure ?? `Plays ${TEST_SECONDS} seconds of a song from your library.`)}
      </span>
    </>
  )

  return (
    <Screen>
      <BackHeader
        onBack={close}
        backLabel={inGame ? 'Back to the game' : 'Back to the lobby'}
        title="Where should the music play?"
      >
        <Button onClick={() => send({ type: 'get_devices' })}>
          <Icon name="refresh" />
          Refresh devices
        </Button>
        <DoneButton onClick={close} />
      </BackHeader>
      <div className="playback">
        {inGame ? (
          <section className="playback__column" aria-labelledby="p-next">
            <h2 id="p-next" className="jm-label">
              Next song
            </h2>
            <p className="jm-section">Plays on {device ?? 'your active device'}</p>
            <p className="jm-caption">
              {myFailure
                ? `The song didn't start: ${myFailure.message}`
                : 'The song playing now stays where it is.'}
            </p>
            {myFailure && (
              <Button
                variant="primary"
                className="playback__retry"
                onClick={() => {
                  send({ type: 'retry_playback' })
                  close()
                }}
              >
                Play it there now
              </Button>
            )}
          </section>
        ) : (
          <section className="playback__column" aria-labelledby="p-mode">
            <h2 id="p-mode" className="jm-label">
              Playback mode
            </h2>
            {you.is_host ? (
              MODES.map((m) => (
                <OptionRow
                  key={m.mode}
                  icon={m.icon}
                  name={m.name}
                  detail={m.detail}
                  pressed={m.mode === room.settings.mode}
                  onClick={() =>
                    send({ type: 'set_settings', settings: { ...room.settings, mode: m.mode } })
                  }
                />
              ))
            ) : (
              <>
                <p className="jm-section">{mode.name}</p>
                <p className="jm-caption">{mode.detail} The host picks this.</p>
              </>
            )}
          </section>
        )}

        <section className="playback__column" aria-labelledby="p-speaker">
          <h2 id="p-speaker" className="jm-label">
            Your speaker
          </h2>
          <ScrollArea className="playback__devices">
            {devices === null && <p className="jm-caption">Looking for your Spotify devices…</p>}
            {devices?.map((d) => (
              <OptionRow
                key={d.id}
                icon={deviceIcon(d)}
                name={d.name}
                detail={deviceDetail(d)}
                pressed={d.name === device}
                onClick={() => choose(d)}
              >
                {testLine}
              </OptionRow>
            ))}
            {devices !== null && (
              <OptionRow
                icon="music"
                name="Whichever device is active"
                detail="The one Spotify last played on"
                pressed={device === null}
                onClick={() => choose(null)}
              >
                {testLine}
              </OptionRow>
            )}
            <p className="jm-caption">
              {devices?.length === 0
                ? 'No devices online. Open Spotify on your speaker, phone or computer, then refresh.'
                : "Don't see your device? Play anything on it from Spotify, then refresh."}
            </p>
          </ScrollArea>
        </section>
      </div>
    </Screen>
  )
}
