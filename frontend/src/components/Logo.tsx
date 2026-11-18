/** The wordmark in its tilted coral pill. Lowercase in markup; the font draws capitals. */
export function Logo({ size = 'sm', className }: { size?: 'sm' | 'xl'; className?: string }) {
  const classes = ['jm-logo', size === 'xl' && 'jm-logo--xl', className].filter(Boolean).join(' ')
  return <span className={classes}>jamster</span>
}
