import type { Device, RoomSettings } from '../../api/messages.ts'
import type { IconName } from '../../components/Icon.tsx'

interface Mode {
  mode: RoomSettings['mode']
  icon: IconName
  name: string
  detail: string
}

// How the room hears the music, as the host picks it.
export const MODES: Mode[] = [
  {
    mode: 'local',
    icon: 'deviceSpeaker',
    name: 'One speaker',
    detail: "You're all in the same room. Music plays on one speaker.",
  },
  {
    mode: 'remote',
    icon: 'phone',
    name: 'Separate speakers',
    detail: "You're in different locations. Music plays on everyone's device at the same time.",
  },
]

// Spotify's device types (lower-cased), as an icon and in words.
const ICONS: Record<string, IconName> = {
  computer: 'laptop',
  smartphone: 'phone',
  tablet: 'phone',
  tv: 'tv',
  castvideo: 'tv',
}

const KINDS: Record<string, string> = {
  computer: 'Computer',
  smartphone: 'Phone',
  tablet: 'Tablet',
  tv: 'TV',
  speaker: 'Speaker',
  avr: 'Stereo',
  castaudio: 'Cast speaker',
  castvideo: 'Cast screen',
  automobile: 'Car',
}

export function deviceIcon(device: Device): IconName {
  return ICONS[device.kind.toLowerCase()] ?? 'deviceSpeaker'
}

/** "Phone", "Speaker, playing now" */
export function deviceDetail(device: Device): string {
  const kind = KINDS[device.kind.toLowerCase()] ?? device.kind
  return device.is_active ? `${kind}, playing now` : kind
}
