import { Button } from '../../components/Button.tsx'
import { CoverScreen } from '../../components/CoverScreen.tsx'
import { Verdict } from '../../components/SongCard.tsx'

/** The host closed the room under a guest: the Home art with what happened and the way back. */
export default function RoomClosed({ code, host }: { code: string; host: string | undefined }) {
  return (
    <CoverScreen>
      <section className="jm-panel app-cover__panel" role="alert" aria-labelledby="closed-head">
        <Verdict right={false}>Room closed</Verdict>
        <h1 id="closed-head" className="jm-headline app-cover__error-head">
          {host ?? 'The host'} closed room {code}.
        </h1>
        <p className="jm-meta">Ask the host for a new code to play again.</p>
        <Button to="/" variant="primary" className="app-cover__big-btn app-cover__error-first">
          Back
        </Button>
      </section>
    </CoverScreen>
  )
}
