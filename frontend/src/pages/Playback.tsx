import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Ring } from '../components/Avatar.tsx'
import { Button, ButtonPair } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/Icon.tsx'
import { OptionRow } from '../components/Rows.tsx'
import { Screen } from '../components/Screen.tsx'
import { Verdict } from '../components/SongCard.tsx'
import { useRoomPaths } from '../paths.ts'
import { SubHeader } from './SubHeader.tsx'
import './Playback.css'

interface Device {
  id: string
  icon: IconName
  name: string
  detail: string
  asleep?: boolean
}

const DEVICES: Device[] = [
  { id: 'tv', icon: 'tv', name: 'Living room TV', detail: 'Spotify on the TV' },
  { id: 'browser', icon: 'laptop', name: 'This browser', detail: "Mara's laptop" },
  { id: 'phone', icon: 'phone', name: "Mara's iPhone", detail: 'Phone' },
  {
    id: 'kitchen',
    icon: 'deviceSpeaker',
    name: 'Kitchen speaker',
    detail: 'Asleep. Open Spotify on it to wake it.',
    asleep: true,
  },
]

/** The speaker: pick a device, play 5 seconds, confirm you heard it. `?test=ready|playing|heard|failed` */
export default function Playback() {
  const paths = useRoomPaths()
  const [params, setParams] = useSearchParams()
  const test = params.get('test') ?? 'playing'
  const [chosen, setChosen] = useState('tv')
  const device = DEVICES.find((d) => d.id === chosen)!.name
  const go = (next: string) => setParams({ test: next }, { replace: true })

  return (
    <Screen>
      <SubHeader back={paths.lobby} title="Where should the music play?">
        <Button>
          <Icon name="refresh" />
          Refresh list
        </Button>
      </SubHeader>
      <div className="playback">
        <section className="playback__devices" aria-label="Spotify devices">
          {DEVICES.map((d) => (
            <OptionRow
              key={d.id}
              icon={d.icon}
              name={d.name}
              detail={d.detail}
              pressed={d.id === chosen}
              disabled={d.asleep}
              onClick={() => setChosen(d.id)}
            />
          ))}
          <p className="jm-caption">
            Don't see your speaker? Play anything on it from Spotify once, then refresh.
          </p>
        </section>

        <section className="jm-panel playback__test" aria-labelledby="test-head">
          <span className="jm-label">Playback test</span>
          {test === 'ready' && (
            <>
              <h2 id="test-head" className="jm-headline">
                Play 5 seconds on {device}?
              </h2>
              <p className="jm-meta">
                Turn the volume up. We play a song nobody holds, so nothing gets spoiled.
              </p>
              <Button
                variant="primary"
                size="xl"
                className="playback__main"
                onClick={() => go('playing')}
              >
                Play a test
              </Button>
            </>
          )}
          {test === 'playing' && (
            <>
              <div className="playback__listening">
                <Ring percent={40} seconds={3} label="3 seconds of the test left" />
                <div>
                  <h2 id="test-head" className="jm-headline">
                    Can you hear it?
                  </h2>
                  <span className="jm-moment__sub">Playing on {device}</span>
                </div>
              </div>
              <p className="jm-meta">
                If nothing comes out, check the TV's volume and that Spotify is open on it.
              </p>
              <ButtonPair className="playback__main">
                <Button onClick={() => go('failed')}>Nothing</Button>
                <Button variant="primary" onClick={() => go('heard')}>
                  Yes, I hear it
                </Button>
              </ButtonPair>
            </>
          )}
          {test === 'heard' && (
            <>
              <Verdict right>Sound works</Verdict>
              <h2 id="test-head" className="jm-headline">
                {device} is ready.
              </h2>
              <p className="jm-meta">Every song in this game plays there.</p>
              <Button to={paths.lobby} variant="primary" size="xl" className="playback__main">
                Use this speaker
              </Button>
            </>
          )}
          {test === 'failed' && (
            <>
              <Verdict right={false}>No sound</Verdict>
              <h2 id="test-head" className="jm-headline">
                Nothing came out of {device}.
              </h2>
              <p className="jm-meta">
                Open Spotify on the TV so it wakes up, check the volume, then try again. Or pick
                another speaker.
              </p>
              <Button
                variant="primary"
                size="xl"
                className="playback__main"
                onClick={() => go('playing')}
              >
                Try again
              </Button>
            </>
          )}
        </section>
      </div>
    </Screen>
  )
}
