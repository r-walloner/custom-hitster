import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './styles/tokens.css'
import './styles/jamster.css'
import './styles/app.css'
import './styles/desktop.css'
import { Fit } from './components/Fit.tsx'
import Home from './screens/home/Home.tsx'
import LibraryPage from './screens/library/LibraryPage.tsx'
import Room from './screens/room/Room.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Fit />}>
          {/* `/?error=` stays: the backend redirects failed sign-ins there. */}
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<LibraryPage />} />
          {/* Inside a room the room's state picks the screen; sub-screens and pop-ups are state too. */}
          <Route path="/room/:code" element={<Room />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
