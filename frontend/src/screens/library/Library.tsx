import { useState } from 'react'
import { startImport } from '../../api/http.ts'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { Screen } from '../../components/Screen.tsx'
import { Waiting } from '../../components/Waiting.tsx'
import { ago } from '../../words.ts'
import { Listing, NotImported, Picker } from './components/LibraryPanel.tsx'
import { useLibrary } from './useLibrary.ts'
import './Library.css'

interface LibraryProps {
  onBack: () => void
  /** "Back to the start", "Back to the lobby". */
  backLabel: string
}

/**
 * Your songs: which of your library's sources go into the deck. Reached from Home
 * and from the lobby, so the picks can change until the host starts. Needs a signed-in player.
 */
export default function Library({ onBack, backLabel }: LibraryProps) {
  // Listing and copying run on the server; the hook polls while they do.
  const { library, failed, pick, reload } = useLibrary(true)
  const [problem, setProblem] = useState<string | null>(null)

  if (failed) return <Waiting text="The server can't be reached. Reload to try again." />

  const startReading = (what: string) =>
    startImport().then(reload, () => setProblem(`${what} didn't work. Try again.`))
  const choose = (changes: Record<string, boolean>) =>
    pick(changes).catch(() => setProblem("Changing what goes in the deck didn't work. Try again."))

  return (
    <Screen>
      <BackHeader onBack={onBack} backLabel={backLabel} title="Your songs">
        {library?.refreshed_at && (
          <span className="jm-caption">Imported {ago(library.refreshed_at)}</span>
        )}
        {library?.sources.length ? (
          <Button
            disabled={library.status === 'running'}
            onClick={() => startReading('Refreshing your library')}
          >
            <Icon name="refresh" />
            Refresh
          </Button>
        ) : null}
        <Button onClick={onBack} variant="primary" className="library__done">
          Done
        </Button>
      </BackHeader>
      <div className="library">
        {library?.sources.length ? (
          <Picker library={library} onPick={choose} />
        ) : !library || library.status === 'running' ? (
          <Listing />
        ) : (
          <NotImported
            problem={library.status === 'error' ? library.detail : undefined}
            onImport={() => startReading('Importing your library')}
          />
        )}
        {problem && (
          <p className="jm-caption" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Screen>
  )
}
