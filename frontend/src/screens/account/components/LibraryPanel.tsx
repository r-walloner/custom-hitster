import { useState } from 'react'
import type { LibraryDetails } from '../../../api/http.ts'
import { Button } from '../../../components/Button.tsx'
import { SearchInput } from '../../../components/Input.tsx'
import { Progress } from '../../../components/Progress.tsx'
import { CheckRow } from '../../../components/Rows.tsx'
import { ScrollArea } from '../../../components/ScrollArea.tsx'
import { importProgress, matching, sourceCount, sourceDetail, summary } from '../sources.ts'
import { useJustImported } from '../useJustImported.ts'

// The account's library panel: the picker of what goes in the deck, or, before the library's
// sources are known, reading them or the way to start.

interface PickerProps {
  library: LibraryDetails
  onPick: (changes: Record<string, boolean>) => void
}

/** Liked songs, top songs, recent plays and playlists, each ticked in or out of the deck. */
export function Picker({ library, onPick }: PickerProps) {
  const [query, setQuery] = useState('')
  const justImported = useJustImported(library)
  const { sources } = library
  const shown = matching(sources, query)
  const all = (picked: boolean) =>
    onPick(Object.fromEntries(sources.map((source) => [source.id, picked])))

  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <div className="account__head">
        <h1 id="lib-head" className="jm-section">
          What goes in the deck
        </h1>
        <span className="jm-caption" aria-live="polite">
          {summary(library)}
        </span>
      </div>
      {library.status === 'error' && (
        <p className="jm-caption" role="alert">
          {library.detail} Refresh the library to try again.
        </p>
      )}
      <div className="account__tools">
        <SearchInput
          className="account__search"
          placeholder="Search your playlists"
          aria-label="Search your playlists"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button onClick={() => all(true)}>All</Button>
        <Button onClick={() => all(false)}>None</Button>
      </div>
      <ScrollArea className="account__list" role="group" aria-label="Library sources">
        {shown.map((source) => {
          const progress = importProgress(source, library, justImported.has(source.id))
          return (
            <CheckRow
              key={source.id}
              name={source.name}
              detail={
                progress !== null ? (
                  <span className="account__importing">
                    <Progress
                      small
                      value={Math.round(progress * 100)}
                      max={100}
                      label={`Importing ${source.name}`}
                    />
                    Importing…
                  </span>
                ) : (
                  sourceDetail(source, library)
                )
              }
              count={sourceCount(source)}
              checked={source.picked}
              onChange={() => onPick({ [source.id]: !source.picked })}
            />
          )
        })}
        {shown.length === 0 && (
          <p className="jm-caption account__none">Nothing called that in your library.</p>
        )}
      </ScrollArea>
    </section>
  )
}

/** Spotify is listing the library's sources; this takes a few seconds. */
export function Listing() {
  return (
    <section className="jm-panel account__panel account__listing" aria-live="polite">
      <p className="jm-meta">Looking through your library…</p>
    </section>
  )
}

interface NotImportedProps {
  /** Why the last attempt to read the library failed. */
  problem?: string
  onImport: () => void
}

export function NotImported({ problem, onImport }: NotImportedProps) {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        {problem ? "Your library couldn't be read." : "Your library isn't in yet."}
      </h1>
      <p className="jm-meta account__intro" role={problem ? 'alert' : undefined}>
        {problem ??
          'We list your liked songs, playlists and top songs. You pick which go into the deck.'}
      </p>
      <div className="account__start">
        <Button variant="primary" className="account__import" onClick={onImport}>
          {problem ? 'Try again' : 'Import my library'}
        </Button>
        <span className="jm-caption">Takes a few seconds.</span>
      </div>
    </section>
  )
}
