import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,           // bind 0.0.0.0 — reachable from phones/tablets on same LAN
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
