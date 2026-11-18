import type { Library } from '../../api/messages.ts'
import { fmt } from '../../words.ts'

// The Home panel's "Your songs" button, in words.

/** The button's label: there's nothing to pick from before the first import. */
export const songsLabel = (library: Library) =>
  library.status === 'none' ? 'Import my library' : 'Your songs'

/** The short note at the button's right end: how many songs can go in the deck. */
export function songsNote(library: Library): string {
  switch (library.status) {
    case 'none':
      return ''
    case 'running':
      return 'Importing…'
    case 'done':
    case 'error':
      return fmt(library.tracks)
  }
}
