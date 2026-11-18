// Numbers and lists in words, the same way on every screen.

export const fmt = (n: number) => n.toLocaleString('en-US')

export const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`

/** "Mara", "Mara and Sam", "Mara, Sam and Lea". */
export function names(list: string[]): string {
  if (list.length <= 1) return list.join('')
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
