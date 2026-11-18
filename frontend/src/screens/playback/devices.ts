import type { Device } from '../../api/messages.ts'
import type { IconName } from '../../components/Icon.tsx'

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
