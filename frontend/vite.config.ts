import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = '127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Spotify accepts http://127.0.0.1 as a login callback, but not http://localhost.
    host: '127.0.0.1',
    // Keep the object form: the string shorthand ('/api': 'http://…') rewrites the Host header
    // to the target's. The backend needs the browser's Host to build the Spotify callback URL
    // and to check the WebSocket origin.
    proxy: {
      '/api': { target: `http://${backend}` },
      '/auth': { target: `http://${backend}` },
      '/ws': { target: `ws://${backend}`, ws: true },
    },
  },
})
