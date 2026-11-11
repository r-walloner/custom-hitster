import type { Library } from '../messages.ts'

export function LibraryStatus({ library }: { library: Library }) {
  const tracks = `${library.tracks.toLocaleString()} tracks`
  switch (library.status) {
    case 'none':
      return <span className="muted">Library not imported yet</span>
    case 'running':
      return <span className="muted">Importing… {library.detail}</span>
    case 'done':
      return <span className="muted">{tracks} imported</span>
    case 'error':
      return (
        <span className="bad-text">
          Import stopped: {library.detail} ({tracks} kept)
        </span>
      )
  }
}
