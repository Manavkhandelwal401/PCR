import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'unvarying-emission-spotted.ngrok-free.dev',
      '.ngrok-free.dev' // Taaki jab agli baar ngrok restart ho aur URL badle, toh dobara block na ho
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})