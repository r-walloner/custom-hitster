import { Icon } from '../../../components/Icon.tsx'
import type { MixChoice } from '../options.ts'
import { MixArt } from './MixArt.tsx'

interface MixCardProps {
  mix: MixChoice
  /** The host's choice. Without it the card only shows the host's pick. */
  onPick?: () => void
}

/** One deck mix in the Deck mix row: its picture, name and one line on what to expect. */
export function MixCard({ mix, onPick }: MixCardProps) {
  const classes = [
    'jm-mix-card',
    mix.picked && 'jm-mix-card--picked',
    mix.planned && 'jm-mix-card--planned',
  ]
  return (
    <li className={classes.filter(Boolean).join(' ')} aria-current={mix.picked || undefined}>
      <span className="jm-mix-card__art">
        <MixArt mix={mix.key} />
        <span className="jm-mix-card__tick">
          <Icon name="check" strokeWidth={3.4} />
        </span>
      </span>
      <span className="jm-mix-card__text">
        <span className="jm-mix-card__name">
          {onPick ? (
            // Its hit area covers the whole card (jamster.css).
            <button
              type="button"
              className="jm-mix-card__pick"
              aria-pressed={mix.picked}
              disabled={mix.planned}
              onClick={onPick}
            >
              {mix.name}
            </button>
          ) : (
            <span>{mix.name}</span>
          )}
          {mix.planned && <span className="jm-mix-card__soon">Soon</span>}
        </span>
        {mix.line && <span className="jm-mix-card__line">{mix.line}</span>}
      </span>
    </li>
  )
}
