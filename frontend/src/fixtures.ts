// Sample data for the static screens, taken from the design boards in docs/design/screens/.
// It goes away once the screens are wired to the room state.

export interface Player {
  id: string
  name: string
  /** Avatar colour, player-1 … player-5. */
  color: 1 | 2 | 3 | 4 | 5
}

export interface Song {
  year: number
  title: string
  artist: string
}

export const ROOM_CODE = 'LUMA'

export const MARA: Player = { id: 'mara', name: 'Mara', color: 1 }
export const JONAS: Player = { id: 'jonas', name: 'Jonas', color: 2 }
export const LEA: Player = { id: 'lea', name: 'Lea', color: 3 }
export const TOBI: Player = { id: 'tobi', name: 'Tobi', color: 4 }
export const SAM: Player = { id: 'sam', name: 'Sam', color: 5 }

/** Mara's timeline during the round shown on the game boards. */
export const MARA_CARDS: Song[] = [
  { year: 1975, title: 'Bohemian Rhapsody', artist: 'Queen' },
  { year: 1994, title: 'Zombie', artist: 'The Cranberries' },
  { year: 2008, title: 'Viva la Vida', artist: 'Coldplay' },
  { year: 2016, title: 'Redbone', artist: 'Childish Gambino' },
]

/** The song in play, revealed. */
export const REVEALED: Song = { year: 1995, title: 'Wonderwall', artist: 'Oasis' }

export interface Score {
  player: Player
  cards: number
  tokens: number
}

/** The mini scoreboard while Mara places. */
export const SCORES: Score[] = [
  { player: MARA, cards: 4, tokens: 3 },
  { player: JONAS, cards: 6, tokens: 1 },
  { player: LEA, cards: 5, tokens: 2 },
  { player: TOBI, cards: 3, tokens: 2 },
  { player: SAM, cards: 2, tokens: 5 },
]

export interface LibrarySource {
  id: string
  name: string
  kind: string
  songs: number
  pinned?: boolean
}

export const LIBRARY: LibrarySource[] = [
  {
    id: 'liked',
    name: 'Liked songs',
    kind: "Everything you've hearted",
    songs: 1206,
    pinned: true,
  },
  { id: 'top', name: 'Your top songs', kind: 'Most played, last 6 months', songs: 50 },
  { id: 'p1', name: 'Car karaoke', kind: 'Playlist', songs: 84 },
  { id: 'p2', name: '90s forever', kind: 'Playlist', songs: 132 },
  { id: 'p3', name: 'Wedding dance floor', kind: 'Playlist', songs: 158 },
  { id: 'p4', name: 'Sunday morning', kind: 'Playlist', songs: 41 },
  { id: 'p5', name: 'Running', kind: 'Playlist', songs: 66 },
  { id: 'p6', name: 'Discover Weekly', kind: 'Playlist by Spotify', songs: 30 },
  { id: 'p7', name: 'Lo-fi to study to', kind: 'Playlist', songs: 210 },
  { id: 'a1', name: 'ABBA', kind: 'Artist you follow', songs: 24 },
  { id: 'a2', name: 'Lauryn Hill', kind: 'Artist you follow', songs: 12 },
]

export const SPEAKER = 'Living room TV'
