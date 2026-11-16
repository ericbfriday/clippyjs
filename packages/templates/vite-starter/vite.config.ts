import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nxReadySignal()],
  server: {
    port: 3000,
  },
});
