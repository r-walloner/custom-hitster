import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Avatar } from '../components/Avatar.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { SearchInput } from '../components/Input.tsx'
import { Logo } from '../components/Logo.tsx'
import { Progress } from '../components/Progress.tsx'
import { CheckRow } from '../components/Rows.tsx'
import { Header, HeaderMeta, Screen, Spacer } from '../components/Screen.tsx'
import { LIBRARY, ROOM_CODE, SAM } from '../fixtures.ts'
import './Account.css'

const fmt = (n: number) => n.toLocaleString('en-US')

/** Account and library: choose what feeds the deck, host or join, and your data. `?library=` */
export default function Account() {
  const [params] = useSearchParams()
  const library = params.get('library') ?? 'imported'

  return (
    <Screen>
      <Header>
        <Logo />
        <Spacer />
        <Avatar player={SAM} size="lg" />
        <HeaderMeta>
          <b>Sam Keller</b>
          <span>Spotify Premium</span>
        </HeaderMeta>
        <Button to="/">
          <Icon name="signOut" />
          Sign out
        </Button>
      </Header>
      <div className="account">
        {library === 'importing' ? (
          <Importing />
        ) : library === 'none' ? (
          <NotImported />
        ) : (
          <Picker />
        )}
        <aside className="account__side">
          <Button
            to={`/room/${ROOM_CODE}/lobby`}
            variant="primary"
            size="xl"
            className="account__host"
          >
            Host a game
          </Button>
          <Button to="/" className="account__join">
            Join a room
          </Button>
          <section className="account__data" aria-labelledby="data-head">
            <h2 id="data-head" className="jm-section">
              Your data
            </h2>
            <p className="jm-caption">
              Copied 3 days ago. Deleting the copy doesn't touch your Spotify account.
            </p>
            <Button>
              <Icon name="refresh" />
              Re-import
            </Button>
            <Button className="app-btn--danger">
              <Icon name="trash" />
              Delete my copy
            </Button>
          </section>
        </aside>
      </div>
    </Screen>
  )
}

const PICKED_AT_FIRST = new Set(['liked', 'top', 'p1', 'p2', 'p3', 'p4', 'p5', 'a1', 'a2'])

function Picker() {
  const [picked, setPicked] = useState(PICKED_AT_FIRST)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = LIBRARY.filter(
    (source) => !q || `${source.name} ${source.kind}`.toLowerCase().includes(q),
  )
  const chosen = LIBRARY.filter((source) => picked.has(source.id))
  const songs = chosen.reduce((sum, source) => sum + source.songs, 0)

  const toggle = (id: string) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <div className="account__head">
        <h1 id="lib-head" className="jm-section">
          What goes in the deck
        </h1>
        <span className="jm-caption" aria-live="polite">
          {chosen.length} of {LIBRARY.length} picked, up to {fmt(songs)} songs
        </span>
      </div>
      <div className="account__tools">
        <SearchInput
          className="account__search"
          placeholder="Search playlists and artists"
          aria-label="Search playlists and artists"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button onClick={() => setPicked(new Set(LIBRARY.map((source) => source.id)))}>All</Button>
        <Button onClick={() => setPicked(new Set())}>None</Button>
      </div>
      <div className="account__list" role="group" aria-label="Library sources">
        {shown.map((source) => (
          <CheckRow
            key={source.id}
            name={source.name}
            detail={source.kind}
            count={fmt(source.songs)}
            pinned={source.pinned}
            checked={picked.has(source.id)}
            onChange={() => toggle(source.id)}
          />
        ))}
        {shown.length === 0 && (
          <p className="jm-caption account__none">Nothing called that in your library.</p>
        )}
      </div>
    </section>
  )
}

function Importing() {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Copying your library…
      </h1>
      <Progress value={812} max={1940} label="Import progress" />
      <p className="jm-meta">
        <b className="account__strong">812 of 1,940 songs</b>, checking release years on MusicBrainz
      </p>
      <p className="jm-caption">
        You can pick playlists once it's done. Join a game meanwhile if you like.
      </p>
    </section>
  )
}

function NotImported() {
  return (
    <section className="jm-panel account__panel" aria-labelledby="lib-head">
      <span className="jm-label">Your library</span>
      <h1 id="lib-head" className="jm-moment__headline">
        Your library isn't in yet.
      </h1>
      <p className="jm-meta account__intro">
        We copy your liked songs, playlists and top songs. Then you pick which ones go into the
        deck.
      </p>
      <div className="account__start">
        <Button variant="primary" className="account__import">
          Import my library
        </Button>
        <span className="jm-caption">Takes a minute or two.</span>
      </div>
    </section>
  )
}
