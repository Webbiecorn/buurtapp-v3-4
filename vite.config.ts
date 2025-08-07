import path from 'path'
import { defineConfig } from 'vite'

// Dit is de standaard, correcte configuratie voor Vite.
// Het leest automatisch de .env bestanden.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
