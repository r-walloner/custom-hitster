import { Button } from '../components/Button.tsx'
import { Verdict } from '../components/SongCard.tsx'
import { HomeCover } from './HomeCover.tsx'

/** A room code that leads nowhere: the Home art with what happened and the way back. */
export default function RoomNotFound({ code }: { code: string }) {
  return (
    <HomeCover>
      <section className="jm-panel home__panel" role="alert" aria-labelledby="gone-head">
        <Verdict right={false}>No such room</Verdict>
        <h1 id="gone-head" className="jm-headline home__error-head">
          There's no room {code}.
        </h1>
        <p className="jm-meta">
          Check the four letters with the host. Rooms close when the server restarts, so the host
          may need to open a new one.
        </p>
        <Button to="/" variant="primary" className="home__big-btn home__error-first">
          Back
        </Button>
      </section>
    </HomeCover>
  )
}
