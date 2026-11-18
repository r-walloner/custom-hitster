// Numbers and lists in words, the same way on every screen.

export const fmt = (n: number) => n.toLocaleString('en-US')

export const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`

/** "Mara", "Mara and Sam", "Mara, Sam and Lea". */
export function names(list: string[]): string {
  if (list.length <= 1) return list.join('')
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/** How long ago an ISO time was: "just now", "5 minutes ago", "3 days ago". */
export function ago(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${plural(minutes, 'minute')} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${plural(hours, 'hour')} ago`
  return `${plural(Math.floor(hours / 24), 'day')} ago`
}
