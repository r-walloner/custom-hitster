import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { CodeInput } from '../components/Input.tsx'
import { ROOM_CODE } from '../fixtures.ts'
import { HomeCover } from './HomeCover.tsx'
import { SignInError } from './SignInError.tsx'

/** Home: join with the four-letter code, or host with Spotify. `?error=` shows the sign-in error. */
export default function Home() {
  const [params] = useSearchParams()
  const error = params.get('error')
  if (error !== null) return <SignInError reason={error} />
  return <JoinOrHost />
}

function JoinOrHost() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const join = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/room/${(code.trim() || ROOM_CODE).toUpperCase()}`)
  }

  return (
    <HomeCover>
      <form className="jm-panel home__panel" onSubmit={join}>
        <label className="jm-label" htmlFor="room-code">
          Room code
        </label>
        <div className="home__join">
          <CodeInput
            id="room-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={ROOM_CODE}
          />
          <Button type="submit" variant="primary">
            Join
          </Button>
        </div>
        <p className="jm-caption">No account needed. Ask the host for the four letters.</p>
        <div className="home__or">
          <span className="jm-caption">or</span>
        </div>
        <Button to="/account" className="home__big-btn">
          <Icon name="music" />
          Host with Spotify
        </Button>
        <p className="jm-caption">
          Hosting needs Spotify Premium. Private, for one group of friends.
        </p>
      </form>
    </HomeCover>
  )
}
