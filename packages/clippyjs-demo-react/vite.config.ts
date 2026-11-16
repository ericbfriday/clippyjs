import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nxReadySignal()],
  server: {
    fs: {
      allow: ['../..'] // Allow serving files from the monorepo root
    }
  }
})
