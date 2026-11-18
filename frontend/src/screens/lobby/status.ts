import type { Library, PlayerView } from '../../api/messages.ts'
import { plural } from '../../words.ts'

/** A library's state in a few words, for a player row. */
export function libraryStatus(library: Library | null): string {
  if (!library) return 'No library'
  switch (library.status) {
    case 'none':
      return 'Library not imported'
    case 'running':
      return 'Importing library…'
    case 'done':
      return `${plural(library.tracks, 'song')} in library`
    case 'error':
      return `Import stopped, ${plural(library.tracks, 'song')} kept`
  }
}

/** The host's own songs, for the setup panel: as short as the panel's other values. */
export function songCount(library: Library | null): string {
  if (!library || library.status === 'none') return 'None imported yet'
  if (library.status === 'running') return 'Importing…'
  return plural(library.tracks, 'song')
}

/** A player's status in the lobby lists. */
export function playerStatus(player: PlayerView, local: boolean): string {
  if (local) return 'Local player'
  if (!player.connected) return 'Reconnecting…'
  const library = player.spotify ? libraryStatus(player.library) : 'Guest'
  return player.is_host ? `Host, ${library.charAt(0).toLowerCase()}${library.slice(1)}` : library
}
