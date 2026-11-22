// The shapes the design-system components draw. Screens build them from the room state.

export interface Player {
  id: string
  name: string
  /** Avatar colour, player-1 … player-5. */
  color: 1 | 2 | 3 | 4 | 5
  /** Their Spotify profile picture, shown in place of the colour and initial. */
  image?: string | null
}

export interface Song {
  /** The track id, when the song is a real card. */
  id?: string
  year: number
  title: string
  artist: string
}
