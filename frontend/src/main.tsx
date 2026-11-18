import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import './styles/tokens.css'
import './styles/jamster.css'
import './styles/app.css'
import { Fit } from './components/Fit.tsx'
import Account from './pages/Account.tsx'
import AddPlayer from './pages/AddPlayer.tsx'
import Dealing from './pages/Dealing.tsx'
import Challenge from './pages/game/Challenge.tsx'
import GameMenu from './pages/game/GameMenu.tsx'
import Guess from './pages/game/Guess.tsx'
import Placing from './pages/game/Placing.tsx'
import Reconnecting from './pages/game/Reconnecting.tsx'
import Reveal from './pages/game/Reveal.tsx'
import Standings from './pages/game/Standings.tsx'
import GuestLobby from './pages/GuestLobby.tsx'
import Home from './pages/Home.tsx'
import JoinName from './pages/JoinName.tsx'
import Lobby from './pages/Lobby.tsx'
import Playback from './pages/Playback.tsx'
import ScreenIndex from './pages/ScreenIndex.tsx'
import Settings from './pages/Settings.tsx'
import Winner from './pages/Winner.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* A scrolling page, outside the fitted 844 × 390 frame. */}
        <Route path="/screens" element={<ScreenIndex />} />

        <Route element={<Fit />}>
          {/* Permanent routes. `/?error=` stays too: the backend redirects failed sign-ins there. */}
          <Route path="/" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/room/:code" element={<JoinName />} />

          {/*
            TEMPORARY: one URL per screen, so the static mock-ups can be reviewed and clicked
            through. Most room screens are states, not pages. When the room state is wired in
            (useRoom), delete this whole group and don't build on it: inside /room/:code the room
            state picks the screen (join, guest or host lobby, dealing, the game phase, winner), and
            settings, the speaker, adding a player, the game menu, the scoreboard and reconnecting
            become component state (sub-screens and dialogs). The variant query parameters
            (?test=, ?library=, ?dealt=, ?state=) come from state too. Also delete paths.ts.
          */}
          <Route path="/room/:code/lobby" element={<Lobby />} />
          <Route path="/room/:code/lobby/guest" element={<GuestLobby />} />
          <Route path="/room/:code/lobby/add-player" element={<AddPlayer />} />
          <Route path="/room/:code/settings" element={<Settings />} />
          <Route path="/room/:code/speaker" element={<Playback />} />
          <Route path="/room/:code/dealing" element={<Dealing />} />
          <Route path="/room/:code/game" element={<Navigate to="placing" replace />} />
          <Route path="/room/:code/game/placing" element={<Placing />} />
          <Route path="/room/:code/game/challenge" element={<Challenge />} />
          <Route path="/room/:code/game/guess" element={<Guess />} />
          <Route path="/room/:code/game/reveal" element={<Reveal />} />
          <Route path="/room/:code/game/menu" element={<GameMenu />} />
          <Route path="/room/:code/game/scoreboard" element={<Standings />} />
          <Route path="/room/:code/game/reconnecting" element={<Reconnecting />} />
          <Route path="/room/:code/winner" element={<Winner />} />

          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
