// The shapes the design-system components draw. Screens build them from the room state.

export interface Player {
  id: string
  name: string
  /** Avatar colour, player-1 … player-5. */
  color: 1 | 2 | 3 | 4 | 5
}

export interface Song {
  /** The track id, when the song is a real card. */
  id?: string
  year: number
  title: string
  artist: string
}

export interface Score {
  player: Player
  cards: number
  tokens: number
}
