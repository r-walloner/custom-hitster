import type { CSSProperties } from 'react'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'

interface TapeProps {
  /** How far the song has played, 0–1. Drives the label's bar and the tape packs. */
  progress: number
  /** The year after the reveal; `????` until then. */
  year?: number
  /** Reels spin only while audio is actually playing. */
  playing?: boolean
  /** The 3px bob (on in the game). */
  bounce?: boolean
  /** The cover's slower bob. */
  slow?: boolean
  /** Rendered width in px (160 in the game, about 200 on covers). */
  width?: number
  /** On covers the tape is decoration: hidden from screen readers, no progressbar. */
  decorative?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

const BAR = 220

/** The sticker cassette: tilted, coral, with the song's progress on its label. */
export function Tape({
  progress,
  year,
  playing = true,
  bounce = true,
  slow,
  width = 160,
  decorative,
  label = 'Mystery song progress',
  className,
  style,
}: TapeProps) {
  const p = Math.min(1, Math.max(0, progress))
  const classes = [
    'jm-tape',
    bounce && 'jm-tape--bounce',
    slow && 'jm-tape--slow',
    playing && 'is-playing',
    className,
  ]
  const a11y = decorative
    ? {}
    : {
        role: 'progressbar',
        'aria-label': label,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(p * 100),
      }
  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      style={style}
      aria-hidden={decorative || undefined}
    >
      <div className="jm-tape__bob">
        <div className="jm-tape__shell">
          <svg
            viewBox="0 0 300 190"
            width={width}
            height={Math.round((width * 190) / 300)}
            style={{ width }}
            {...a11y}
          >
            <rect
              className="t-shell"
              x="4"
              y="4"
              width="292"
              height="182"
              rx="18"
              strokeWidth="7"
            />
            <circle className="t-ink" cx="17" cy="17" r="4.5" />
            <circle className="t-ink" cx="283" cy="17" r="4.5" />
            <circle className="t-ink" cx="17" cy="173" r="4.5" />
            <circle className="t-ink" cx="283" cy="173" r="4.5" />
            <rect className="t-window" x="92" y="70" width="116" height="40" rx="20" />
            <circle
              className="t-pack"
              cx="105"
              cy="90"
              r="36"
              style={{ transform: `scale(${1 - 0.6 * p})` }}
            />
            <circle
              className="t-pack"
              cx="195"
              cy="90"
              r="36"
              style={{ transform: `scale(${0.4 + 0.6 * p})` }}
            />
            <g className="t-reel">
              <circle className="t-hub" cx="105" cy="90" r="13" strokeWidth="4" />
              <path
                className="t-spoke"
                d="M105 80v20M96.3 85l17.4 10M96.3 95l17.4-10"
                strokeWidth="4"
              />
            </g>
            <g className="t-reel">
              <circle className="t-hub" cx="195" cy="90" r="13" strokeWidth="4" />
              <path
                className="t-spoke"
                d="M195 80v20M186.3 85l17.4 10M186.3 95l17.4-10"
                strokeWidth="4"
              />
            </g>
            <path
              className="t-label"
              fillRule="evenodd"
              strokeWidth="5"
              d="M30 18H270A8 8 0 0 1 278 26V138A8 8 0 0 1 270 146H30A8 8 0 0 1 22 138V26A8 8 0 0 1 30 18Z M92 70H208A20 20 0 0 1 208 110H92A20 20 0 0 1 92 70Z"
            />
            <text className="t-year" x="150" y="60" textAnchor="middle">
              {year ?? '????'}
            </text>
            <rect className="t-track" x="40" y="122" width={BAR} height="11" rx="5.5" />
            <rect className="t-bar" x="40" y="122" width={BAR * p} height="11" rx="5.5" />
            <path className="t-foot" strokeWidth="5" d="M78 186L90 156H210L222 186" />
            <circle className="t-ink" cx="112" cy="174" r="6" />
            <circle className="t-ink" cx="188" cy="174" r="6" />
          </svg>
        </div>
      </div>
    </div>
  )
}

interface TapePlayerProps {
  progress: number
  /** `0:09 / 0:30` */
  time: string
  year?: number
  playing?: boolean
  onRestart?: () => void
}

/** The song in play: the tape, and one line under it with the time and a small restart icon. */
export function TapePlayer({ progress, time, year, playing, onRestart }: TapePlayerProps) {
  return (
    <div className="jm-tape-player">
      <Tape
        progress={progress}
        year={year}
        playing={playing}
        label={year === undefined ? 'Mystery song progress' : 'Song progress'}
      />
      <div className="jm-tape__foot">
        <span className="jm-time">{time}</span>
        <Button size="icon-sm" aria-label="Restart the song from the beginning" onClick={onRestart}>
          <Icon name="restart" />
        </Button>
      </div>
    </div>
  )
}
