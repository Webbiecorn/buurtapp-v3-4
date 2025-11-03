import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Verhoog limiet naar 1MB
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
