import { Button } from '../../components/Button.tsx'
import { HomeCover } from '../../components/HomeCover.tsx'
import { Verdict } from '../../components/SongCard.tsx'

interface Reason {
  tag: string
  head: string
  body: string
  primary: [string, string]
  secondary: [string, string]
}

const REASONS: Record<string, Reason> = {
  notApproved: {
    tag: 'Not approved yet',
    head: "Spotify hasn't approved this account for Jamster.",
    body: 'Jamster is private, so the host adds each Spotify account by hand. Send the host the email you use for Spotify, then try again.',
    primary: ['Try again', '/account'],
    secondary: ['Back', '/'],
  },
  notPremium: {
    tag: 'No Premium',
    head: "This account can't play the music.",
    body: "Playing songs needs Spotify Premium. Your library can still go into the deck, and another player's speaker plays it.",
    primary: ['Continue', '/account'],
    secondary: ['Use another account', '/account'],
  },
  full: {
    tag: 'Five accounts in',
    head: 'Five Spotify accounts are already connected.',
    body: "That's the most Jamster can connect. Join as a guest, or ask the host to remove an account first.",
    primary: ['Join as a guest', '/'],
    secondary: ['Back', '/'],
  },
  cancelled: {
    tag: 'Cancelled',
    head: 'Sign-in was cancelled.',
    body: "Spotify didn't send a login back, so nothing was saved.",
    primary: ['Try again', '/account'],
    secondary: ['Back', '/'],
  },
  network: {
    tag: 'No connection',
    head: "Couldn't reach Spotify.",
    body: 'Check your connection and try again. Nothing is lost.',
    primary: ['Try again', '/account'],
    secondary: ['Back', '/'],
  },
}

// The codes the backend redirects with (web.py: /?error=…), mapped onto the designed reasons.
const BACKEND_CODES: Record<string, string> = {
  not_allowed: 'notApproved',
  spotify: 'network',
}

/** The sign-in error: the Home art with the panel swapped for what happened and the next step. */
export function SignInError({ reason }: { reason: string }) {
  const r = REASONS[BACKEND_CODES[reason] ?? reason] ?? REASONS.network
  return (
    <HomeCover>
      <section className="jm-panel home__panel" role="alert" aria-labelledby="err-head">
        <Verdict right={false}>{r.tag}</Verdict>
        <h1 id="err-head" className="jm-headline home__error-head">
          {r.head}
        </h1>
        <p className="jm-meta">{r.body}</p>
        <Button to={r.primary[1]} variant="primary" className="home__big-btn home__error-first">
          {r.primary[0]}
        </Button>
        <Button to={r.secondary[1]} className="home__big-btn">
          {r.secondary[0]}
        </Button>
      </section>
    </HomeCover>
  )
}
