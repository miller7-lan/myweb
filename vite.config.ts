import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devHost = process.env.VITE_DEV_HOST || '127.0.0.1'
const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ? process.env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean)
  : []

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: devHost,
    port: 5173,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  }
})
