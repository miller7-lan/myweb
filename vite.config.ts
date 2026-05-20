import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true, // In Vite 5+, needed if tunnel uses random hostnames
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  }
})
