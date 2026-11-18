interface ProgressProps {
  value: number
  max: number
  label: string
  small?: boolean
  className?: string
}

/** A filling bar for amounts (an import, cards toward the goal). Never for time. */
export function Progress({ value, max, label, small, className }: ProgressProps) {
  const classes = ['jm-progress', small && 'jm-progress--sm', className].filter(Boolean).join(' ')
  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}
