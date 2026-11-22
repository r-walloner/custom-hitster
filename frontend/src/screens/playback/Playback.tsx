import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { DoneButton } from '../../components/DoneButton.tsx'
import { Icon } from '../../components/Icon.tsx'
import { OptionRow } from '../../components/Rows.tsx'
import { Screen } from '../../components/Screen.tsx'
import { names } from '../../words.ts'
import { useRoomTools } from '../room/context.ts'
import { RefreshDevices, SpeakerList } from './components/SpeakerList.tsx'
import { MODES, withoutSpotify } from './devices.ts'
import { TEST_SECONDS, useSpeakerTest } from './useSpeakerTest.ts'
import { useSpeakers } from './useSpeakers.ts'
import './Playback.css'

/**
 * How the room hears the music, and your speaker: pick one, tap Test to hear a song on it. A
 * sub-screen of the lobby; in the game, PlaybackDialog keeps only your speaker.
 */
export default function Playback() {
  const { room, you, send, devices, playbackTest, close } = useRoomTools()
  const mine = room.players.find((seat) => seat.id === you.player_id)
  const { test, failure, toggle, reset } = useSpeakerTest(playbackTest, send)
  const { refresh, choose } = useSpeakers(send, reset)

  const noLibrary = !mine?.library || mine.library.tracks === 0
  const mode = MODES.find((m) => m.mode === room.settings.mode) ?? MODES[0]
  // Separate speakers need everyone on Spotify; a guest without it would hear nothing.
  const guests = withoutSpotify(room.players)
  const blocked = (m: (typeof MODES)[number]) => m.mode === 'remote' && guests.length > 0

  // The test plays a song, on the picked speaker.
  const testLine = (
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
      <BackHeader onBack={close} backLabel="Back to the lobby" title="Where should the music play?">
        <RefreshDevices onClick={refresh} />
        <DoneButton onClick={close} />
      </BackHeader>
      <div className="playback">
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
                detail={
                  blocked(m)
                    ? `Needs everyone logged in with Spotify, and ${names(guests)} ${guests.length === 1 ? "isn't" : "aren't"}.`
                    : m.detail
                }
                pressed={m.mode === room.settings.mode}
                disabled={blocked(m)}
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

        <SpeakerList
          devices={devices}
          device={mine?.device ?? null}
          onChoose={choose}
          picked={testLine}
        >
          {devices?.length !== 0 && (
            <p className="jm-caption">
              Don't see your device? Play anything on it from Spotify, then refresh.
            </p>
          )}
        </SpeakerList>
      </div>
    </Screen>
  )
}
