import { useSearchParams } from 'react-router'
import { Button, ButtonPair, Status } from '../../components/Button.tsx'
import { Dialog, Overlay } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { usePhaseBehind } from './phases.ts'
import '../Dialogs.css'

/** Reconnecting blocks the game, which stays visible behind it. `?state=reconnecting|failed` */
export default function Reconnecting() {
  const { Behind, back } = usePhaseBehind()
  const [params] = useSearchParams()
  const failed = params.get('state') === 'failed'
  const title = failed ? "Couldn't get you back in." : 'Getting you back in…'

  return (
    <Overlay under={<Behind />}>
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
            <Button to={back} variant="primary">
              Reload
            </Button>
          </ButtonPair>
        ) : (
          <div className="reconnecting__trying">
            <Status>Reconnecting…</Status>
            <span className="jm-time">attempt 2</span>
          </div>
        )}
      </Dialog>
    </Overlay>
  )
}
