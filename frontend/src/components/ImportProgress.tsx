import { Progress } from './Progress.tsx'

interface ImportProgressProps {
  /** How far the import is, from 0 to 1. */
  value: number
  /** As a row's value or a headline: the text in their type, a longer and taller bar. */
  strong?: boolean
  className?: string
}

/** "Importing…" over a bar: how far a library import is. */
export function ImportProgress({ value, strong, className }: ImportProgressProps) {
  const classes = ['app-importing', strong && 'app-importing--strong', className]
  return (
    <span className={classes.filter(Boolean).join(' ')}>
      <span className={strong ? undefined : 'jm-caption'}>Importing…</span>
      <Progress
        small
        value={Math.round(value * 100)}
        max={100}
        label="Importing your songs"
        className="app-importing__bar"
      />
    </span>
  )
}
