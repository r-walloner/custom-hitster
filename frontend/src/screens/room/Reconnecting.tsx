import { Button, ButtonPair, Status } from '../../components/Button.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import './Reconnecting.css'

/** Reconnecting blocks the room, which stays visible behind it. */
export default function Reconnecting({ failed, attempt }: { failed: boolean; attempt: number }) {
  const title = failed ? "Couldn't get you back in." : 'Getting you back in…'
  return (
    <Dialog
      alert
      title={title}
      className="reconnecting"
      head={(titleId) => (
        <div className="reconnecting__head">
          <span className="reconnecting__badge">
            <Icon name="offline" size={22} />
          </span>
          <h1 id={titleId} className="jm-moment__headline">
            {title}
          </h1>
        </div>
      )}
    >
      <p className="jm-meta">
        {failed
          ? 'Reload to take your seat back. Nothing is lost.'
          : 'Connection dropped. Your progress is safe.'}
      </p>
      {failed ? (
        <ButtonPair>
          <Button to="/">Leave room</Button>
          <Button variant="primary" onClick={() => location.reload()}>
            Reload
          </Button>
        </ButtonPair>
      ) : (
        <div className="reconnecting__trying">
          <Status>Reconnecting…</Status>
          {attempt > 0 && <span className="jm-time">attempt {attempt}</span>}
        </div>
      )}
    </Dialog>
  )
}
