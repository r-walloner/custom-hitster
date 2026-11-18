import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, Token } from '../components/Button.tsx'
import { Logo } from '../components/Logo.tsx'
import { Toast } from '../components/Toast.tsx'
import { ROOM_CODE } from '../fixtures.ts'
import './ScreenIndex.css'

const room = `/room/${ROOM_CODE}`

// Every screen and design variant, grouped like the screens canvas in docs/design/screens/.
const SECTIONS: {
  title: string
  screens: { name: string; path: string; variants?: [string, string][] }[]
}[] = [
  {
    title: 'Entry',
    screens: [
      { name: 'Home', path: '/' },
      {
        name: 'Sign-in error',
        path: '/?error=not_allowed',
        variants: [
          ['Not approved', '/?error=notApproved'],
          ['No Premium', '/?error=notPremium'],
          ['Five accounts', '/?error=full'],
          ['Cancelled', '/?error=cancelled'],
          ['No connection', '/?error=network'],
        ],
      },
      {
        name: 'Account and library',
        path: '/account',
        variants: [
          ['Imported', '/account?library=imported'],
          ['Importing', '/account?library=importing'],
          ['Not imported', '/account?library=none'],
        ],
      },
    ],
  },
  {
    title: 'Joining a room',
    screens: [
      { name: 'Join: your name', path: room },
      { name: 'Lobby (guest)', path: `${room}/lobby/guest` },
    ],
  },
  {
    title: 'Before the game',
    screens: [
      { name: 'Lobby (host)', path: `${room}/lobby` },
      { name: 'Game settings', path: `${room}/settings` },
      {
        name: 'Speaker and playback test',
        path: `${room}/speaker`,
        variants: ['ready', 'playing', 'heard', 'failed'].map((test) => [
          test,
          `${room}/speaker?test=${test}`,
        ]),
      },
      { name: 'Add a player', path: `${room}/lobby/add-player` },
      {
        name: 'Dealing',
        path: `${room}/dealing`,
        variants: [0, 1, 2, 3, 4].map((dealt) => [
          `${dealt} dealt`,
          `${room}/dealing?dealt=${dealt}`,
        ]),
      },
    ],
  },
  {
    title: 'During the game',
    screens: [
      { name: '1 · Placing', path: `${room}/game/placing` },
      { name: '2 · Challenge', path: `${room}/game/challenge` },
      { name: '3 · Challengers guess', path: `${room}/game/guess` },
      { name: '4 · Reveal and result', path: `${room}/game/reveal` },
      { name: 'Game menu', path: `${room}/game/menu` },
      { name: 'Scoreboard', path: `${room}/game/scoreboard` },
      {
        name: 'Reconnecting',
        path: `${room}/game/reconnecting`,
        variants: [
          ['Reconnecting', `${room}/game/reconnecting`],
          ['Failed', `${room}/game/reconnecting?state=failed`],
        ],
      },
    ],
  },
  { title: 'After the game', screens: [{ name: 'Winner', path: `${room}/winner` }] },
]

/** A development index of every screen. Not part of the app; remove it once nobody needs it. */
export default function ScreenIndex() {
  return (
    <div className="index">
      <header className="index__head">
        <Logo />
        <h1 className="jm-headline">Screens</h1>
        <p className="jm-meta">
          Static mock-ups, routed one URL per screen. Designs: <code>docs/design/screens/</code>.
        </p>
      </header>
      {SECTIONS.map((section) => (
        <section key={section.title} className="jm-panel index__section">
          <h2 className="jm-section">{section.title}</h2>
          <ul>
            {section.screens.map((screen) => (
              <li key={screen.name}>
                <Link to={screen.path}>{screen.name}</Link>
                {screen.variants && (
                  <span className="index__variants">
                    {screen.variants.map(([label, path]) => (
                      <Link key={path} to={path} className="jm-chip">
                        {label}
                      </Link>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="jm-panel index__section">
        <h2 className="jm-section">Action feedback</h2>
        <p className="jm-caption">One at a time, bottom centre. Gone after 4 seconds.</p>
        <div className="index__toasts">
          <Example label="Speaker failed">
            <Toast
              tone="wrong"
              icon="speakerOff"
              alert
              action={
                <Button to={`${room}/speaker`} variant="primary">
                  Change
                </Button>
              }
            >
              Living room TV stopped playing.
            </Toast>
          </Example>
          <Example label="Refused">
            <Toast tone="wrong" icon="pass">
              Not your turn. Sam is placing.
            </Toast>
          </Example>
          <Example label="Refused, with numbers">
            <Toast tone="wrong" icon="pass">
              Not enough tokens. A card costs <Token>3</Token>.
            </Toast>
          </Example>
          <Example label="Heads-up">
            <Toast tone="heads-up" icon="info">
              Lea's connection dropped. Her seat is safe.
            </Toast>
          </Example>
          <Example label="With an action">
            <Toast tone="heads-up" icon="speaker" action={<Button variant="primary">Retry</Button>}>
              Sam's music dropped.
            </Toast>
          </Example>
          <Example label="Small wins">
            <Toast tone="right" icon="check">
              Invite link copied.
            </Toast>
          </Example>
        </div>
      </section>
    </div>
  )
}

function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="index__example">
      <span className="jm-label">{label}</span>
      {children}
    </div>
  )
}
