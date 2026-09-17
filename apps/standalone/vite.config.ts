import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // VERIFY: HMR über den von Codespaces weitergeleiteten HTTPS-Port ungeprüft. Falls WebSocket-
    // Updates dort nicht ankommen, braucht `hmr` vermutlich `clientPort: 443` bzw. `protocol: 'wss'`.
  },
});
