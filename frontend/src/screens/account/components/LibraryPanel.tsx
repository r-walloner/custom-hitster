import type { Library } from '../../../api/messages.ts'
import { Button } from '../../../components/Button.tsx'
import { Progress } from '../../../components/Progress.tsx'
import { plural } from '../../../words.ts'

// The account's library panel in its three states: copied, being copied, not copied yet.

/**
 * The library is in. The design picks playlists and artists here, but the backend has no notion of
 * sources yet (a backend TODO in README.md), so this shows what was copied.
 */
export function Imported({ library }: { library: Library }) {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        {library.status === 'error'
          ? `The import stopped. ${plural(library.tracks, 'song')} kept.`
          : `${plural(library.tracks, 'song')} ${library.tracks === 1 ? 'is' : 'are'} in.`}
      </h1>
      <p className="jm-meta account__intro">
        {library.status === 'error'
          ? `${library.detail} Re-import to try again.`
          : 'Your liked songs, your playlists, your top songs and what you played lately. Songs from all of them can turn up in the decks of the rooms you play in.'}
      </p>
    </section>
  )
}

export function Importing({ library }: { library: Library }) {
  // The importer reports "Saved tracks: 812 of 1940" and the like.
  const step = /(\d+) of (\d+)/.exec(library.detail)
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Copying your library…
      </h1>
      {step && (
        <Progress value={Number(step[1])} max={Number(step[2]) || 1} label="Import progress" />
      )}
      <p className="jm-meta">
        <b className="account__strong">{plural(library.tracks, 'song')} so far</b>,{' '}
        {library.detail.charAt(0).toLowerCase() + library.detail.slice(1)}
      </p>
      <p className="jm-caption">Join or host a game meanwhile if you like.</p>
    </section>
  )
}

export function NotImported({ onImport }: { onImport: () => void }) {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Your library isn't in yet.
      </h1>
      <p className="jm-meta account__intro">
        We copy your liked songs, playlists and top songs. Songs from them turn up in the decks of
        the rooms you play in.
      </p>
      <div className="account__start">
        <Button variant="primary" className="account__import" onClick={onImport}>
          Import my library
        </Button>
        <span className="jm-caption">Takes a minute or two.</span>
      </div>
    </section>
  )
}
