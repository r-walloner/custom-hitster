import { Button } from '../../components/Button.tsx'
import { CoverScreen } from '../../components/CoverScreen.tsx'
import { Verdict } from '../../components/SongCard.tsx'

/** A room code that leads nowhere: the Home art with what happened and the way back. */
export default function RoomNotFound({ code }: { code: string }) {
  return (
    <CoverScreen>
      <section className="jm-panel app-cover__panel" role="alert" aria-labelledby="gone-head">
        <Verdict right={false}>No such room</Verdict>
        <h1 id="gone-head" className="jm-headline app-cover__error-head">
          There's no room {code}.
        </h1>
        <p className="jm-meta">
          Check the four letters with the host. Rooms close when the server restarts, so the host
          may need to open a new one.
        </p>
        <Button to="/" variant="primary" className="app-cover__big-btn app-cover__error-first">
          Back
        </Button>
      </section>
    </CoverScreen>
  )
}
