import type { ReactNode } from 'react'
import type { Player } from '../types.ts'
import { Avatar } from './Avatar.tsx'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

interface SettingRowProps {
  /** The small caps name: "Music plays on". */
  label: string
  /** "Living room TV" */
  value: ReactNode
  caption?: ReactNode
  className?: string
  /** The button on the right: Change. */
  children?: ReactNode
}

/** A setting with its value and a Change button. */
export function SettingRow({ label, value, caption, className, children }: SettingRowProps) {
  return (
    <div className={['jm-setting', className].filter(Boolean).join(' ')}>
      <div className="jm-setting__text">
        <h2 className="jm-label">{label}</h2>
        <span className="jm-setting__value">{value}</span>
        {caption && <span className="jm-caption">{caption}</span>}
      </div>
      {children}
    </div>
  )
}

interface ControlRowProps {
  /** The setting's name; also labels the control. */
  name: string
  caption: string
  /** The id the control's group is labelled by. */
  nameId: string
  /** Use a <label> for the name (when the control is a single form field). */
  labelFor?: string
  className?: string
  children: ReactNode
}

/** A line on the settings screen: name and caption on the left, the control on the right. */
export function ControlRow({
  name,
  caption,
  nameId,
  labelFor,
  className,
  children,
}: ControlRowProps) {
  return (
    <div className={['jm-setting', className].filter(Boolean).join(' ')}>
      <div className="jm-setting__text">
        {labelFor ? (
          <label id={nameId} htmlFor={labelFor} className="jm-section">
            {name}
          </label>
        ) : (
          <span id={nameId} className="jm-section">
            {name}
          </span>
        )}
        <span className="jm-caption">{caption}</span>
      </div>
      {children}
    </div>
  )
}

interface OptionRowProps {
  icon: IconName
  name: string
  detail: string
  pressed: boolean
  /** Can't be picked; `detail` says why. */
  disabled?: boolean
  onClick?: () => void
}

/** One of several: a speaker. */
export function OptionRow({ icon, name, detail, pressed, disabled, onClick }: OptionRowProps) {
  return (
    <button
      type="button"
      className="jm-option"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span className="jm-player__name">
        {name}
        <small>{detail}</small>
      </span>
      {!disabled && <span className="jm-option__dot" />}
    </button>
  )
}

interface CheckRowProps {
  name: string
  detail: string
  count: string
  checked: boolean
  onChange: () => void
  /** The most important item, first, with a rule under it (Liked songs). */
  pinned?: boolean
}

/** Many of several: a playlist or artist that feeds the deck. */
export function CheckRow({ name, detail, count, checked, onChange, pinned }: CheckRowProps) {
  const classes = [
    'jm-check-row',
    pinned && 'app-check-row--pinned',
    !checked && 'app-check-row--off',
  ]
  return (
    <label className={classes.filter(Boolean).join(' ')}>
      <input className="jm-check" type="checkbox" checked={checked} onChange={onChange} />
      <span className="app-check-row__text">
        <span className="app-check-row__name">{name}</span>
        <span className="jm-caption">{detail}</span>
      </span>
      <span className="jm-check-row__count">{count}</span>
    </label>
  )
}

interface PlayerRowProps {
  player: Player
  /** One short fact: "Host, 1,940 songs in library". */
  status?: string
  /** The player looking at this screen. */
  you?: boolean
  /** Reconnecting: dashed avatar. */
  away?: boolean
  className?: string
  /** A badge or a remove ✕ on the right. */
  children?: ReactNode
}

/** A player in the lobby. */
export function PlayerRow({ player, status, you, away, className, children }: PlayerRowProps) {
  const classes = ['jm-player', 'jm-player--list', you && 'app-player--you', className]
  return (
    <div className={classes.filter(Boolean).join(' ')}>
      <Avatar player={player} away={away} />
      <span className="jm-player__name">
        {player.name}
        {status && <small>{status}</small>}
      </span>
      {children}
    </div>
  )
}
