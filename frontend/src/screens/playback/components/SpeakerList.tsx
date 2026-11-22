import type { ReactNode } from 'react'
import type { Device } from '../../../api/messages.ts'
import { Button } from '../../../components/Button.tsx'
import { Icon } from '../../../components/Icon.tsx'
import { OptionRow } from '../../../components/Rows.tsx'
import { ScrollArea } from '../../../components/ScrollArea.tsx'
import { deviceDetail, deviceIcon } from '../devices.ts'
import '../Playback.css'

interface SpeakerListProps {
  /** Your Spotify devices; null while they are being looked up. */
  devices: Device[] | null
  /** The name of the picked device; null for whichever device is active. */
  device: string | null
  onChoose: (device: Device | null) => void
  /** Shown inside the picked row, under its name: the Test button. */
  picked?: ReactNode
  /** Lines under the list, after the hint for an empty one. */
  children?: ReactNode
}

/** "Your speaker": your Spotify devices and whichever is active, one to pick. */
export function SpeakerList({ devices, device, onChoose, picked, children }: SpeakerListProps) {
  return (
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
            onClick={() => onChoose(d)}
          >
            {picked}
          </OptionRow>
        ))}
        {devices !== null && (
          <OptionRow
            icon="music"
            name="Whichever device is active"
            detail="The one Spotify last played on"
            pressed={device === null}
            onClick={() => onChoose(null)}
          >
            {picked}
          </OptionRow>
        )}
        {devices?.length === 0 && (
          <p className="jm-caption">
            No devices online. Open Spotify on your speaker, phone or computer, then refresh.
          </p>
        )}
        {children}
      </ScrollArea>
    </section>
  )
}

/** The header button that asks Spotify for the devices again. */
export function RefreshDevices({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Icon name="refresh" />
      Refresh devices
    </Button>
  )
}
