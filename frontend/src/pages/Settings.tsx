import { useState } from 'react'
import { Button } from '../components/Button.tsx'
import { ControlRow } from '../components/Rows.tsx'
import { Screen } from '../components/Screen.tsx'
import { Segmented, Stepper } from '../components/Stepper.tsx'
import { useRoomPaths } from '../paths.ts'
import { SubHeader } from './SubHeader.tsx'
import './Settings.css'

const MUSIC = ['One speaker', "Everyone's Spotify"] as const
const CHALLENGE = ['10 s', '15 s', '20 s', '30 s'] as const
const NEXT = ['5 s', '10 s', '20 s', 'Tap'] as const

/** Game settings: one line each, steppers and toggles, plain numbers. */
export default function Settings() {
  const paths = useRoomPaths()
  const [music, setMusic] = useState<(typeof MUSIC)[number]>('One speaker')
  const [toWin, setToWin] = useState(10)
  const [tokens, setTokens] = useState(2)
  const [deck, setDeck] = useState(120)
  const [challenge, setChallenge] = useState<(typeof CHALLENGE)[number]>('20 s')
  const [next, setNext] = useState<(typeof NEXT)[number]>('10 s')

  return (
    <Screen>
      <SubHeader back={paths.lobby} title="Game settings">
        <Button to={paths.lobby} variant="primary" className="settings__done">
          Done
        </Button>
      </SubHeader>
      <div className="settings">
        <ControlRow
          name="Where the music plays"
          nameId="s-music"
          caption="One speaker for a room together. Everyone's own Spotify for a call: each phone plays the song at the same moment."
          className="settings__music"
        >
          <Segmented labelledBy="s-music" options={MUSIC} value={music} onChange={setMusic} />
        </ControlRow>
        <div className="settings__grid">
          <ControlRow name="Cards to win" nameId="s-win" caption="First to this many wins.">
            <Stepper
              labelledBy="s-win"
              value={toWin}
              onChange={setToWin}
              min={3}
              max={20}
              lessLabel="Fewer cards"
              moreLabel="More cards"
            />
          </ControlRow>
          <ControlRow
            name="Starting tokens"
            nameId="s-tokens"
            caption="For challenges and skips. Three buy a card."
          >
            <Stepper
              labelledBy="s-tokens"
              value={tokens}
              onChange={setTokens}
              max={9}
              lessLabel="Fewer tokens"
              moreLabel="More tokens"
            />
          </ControlRow>
          <ControlRow
            name="Deck size"
            nameId="s-deck"
            caption="Picked from 3,402 songs in 2 libraries."
          >
            <Stepper
              labelledBy="s-deck"
              value={deck}
              onChange={setDeck}
              step={10}
              min={40}
              max={400}
              lessLabel="Smaller deck"
              moreLabel="Bigger deck"
            />
          </ControlRow>
          <ControlRow
            name="Deck mix"
            nameId="s-strategy-name"
            labelFor="s-strategy"
            caption="How songs are picked from each library."
          >
            <select id="s-strategy" className="jm-select settings__select">
              <option>Even mix of libraries</option>
              <option>Spread across decades</option>
            </select>
          </ControlRow>
          <ControlRow
            name="Time to challenge"
            nameId="s-challenge"
            caption="After the placement is locked in."
          >
            <Segmented
              labelledBy="s-challenge"
              options={CHALLENGE}
              value={challenge}
              onChange={setChallenge}
            />
          </ControlRow>
          <ControlRow
            name="Next song starts"
            nameId="s-next"
            caption="After the reveal. Anyone can keep listening."
          >
            <Segmented labelledBy="s-next" options={NEXT} value={next} onChange={setNext} />
          </ControlRow>
        </div>
      </div>
    </Screen>
  )
}
