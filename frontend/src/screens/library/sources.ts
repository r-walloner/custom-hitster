import type { LibraryDetails, Source } from '../../api/http.ts'
import { fmt, plural } from '../../words.ts'

// The library screen's picker of library sources, in words.

const KINDS: Record<Source['kind'], string> = {
  liked: "Everything you've hearted",
  top: 'Your most played songs',
  recent: 'Your last 50 plays',
  playlist: 'Playlist',
  collaborative: 'Collaborative playlist',
}

/** The line under a source's name: what it is, or how its import is going. */
export function sourceDetail(source: Source, library: LibraryDetails): string {
  if (source.picked && !source.copied) {
    return library.status === 'error'
      ? 'Not imported, refresh the library to try again'
      : 'Waiting to import'
  }
  return KINDS[source.kind]
}

/**
 * How far a source's import is, from 0 to 1, by requests done; null when it isn't being
 * imported. `justImported` holds the bar full for a moment after the import ends.
 */
export function importProgress(
  source: Source,
  library: LibraryDetails,
  justImported: boolean,
): number | null {
  if (justImported) return 1
  if (!source.picked || !source.copying) return null
  // The importer reports "Copying Liked songs: 9 of 25 requests". Without it, the import waits
  // for another player's. Right after one source finishes, the next is already marked as
  // copying while the line still reports the last one's "3 of 3", so only trust a line that
  // names this source.
  if (!library.detail.startsWith(`Copying ${source.name}: `)) return 0
  const step = /(\d+) of (\d+) requests$/.exec(library.detail)
  return step ? Math.min(1, Number(step[1]) / Math.max(1, Number(step[2]))) : 0
}

/** The sources that were waiting for or in an import in `before` and are imported in `after`. */
export function newlyImported(before: LibraryDetails, after: LibraryDetails): string[] {
  const pending = new Set(
    before.sources.filter((source) => source.picked && !source.copied).map((source) => source.id),
  )
  return after.sources
    .filter((source) => pending.has(source.id) && source.picked && source.copied)
    .map((source) => source.id)
}

/** The count on the right; empty while Spotify hasn't said. */
export const sourceCount = (source: Source) => (source.songs === null ? '' : fmt(source.songs))

/** The sources whose name or kind contains `query`, ignoring case. */
export function matching(sources: Source[], query: string): Source[] {
  const q = query.trim().toLowerCase()
  if (!q) return sources
  return sources.filter(
    (source) =>
      source.name.toLowerCase().includes(q) || KINDS[source.kind].toLowerCase().includes(q),
  )
}

/**
 * "3 of 12 selected, 1,340 songs in total": the songs in the selected sources as Spotify counts
 * them, imported yet or not. A song in two sources counts twice.
 */
export function summary(library: LibraryDetails): string {
  const selected = library.sources.filter((source) => source.picked)
  const songs = selected.reduce((sum, source) => sum + (source.songs ?? 0), 0)
  return `${selected.length} of ${library.sources.length} selected, ${plural(songs, 'song')} in total`
}
