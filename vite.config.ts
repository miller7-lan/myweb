import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devHost = process.env.VITE_DEV_HOST || '127.0.0.1'
const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ? process.env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean)
  : []

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (!normalizedId.includes('node_modules')) return undefined
          if (normalizedId.includes('/@react-three/')) return 'vendor-react-three'
          if (normalizedId.includes('/three/') || normalizedId.includes('/three.')) return 'vendor-three'
          if (
            normalizedId.includes('/react/') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/scheduler/') ||
            normalizedId.includes('/zustand/')
          ) {
            return 'vendor-react'
          }
          if (normalizedId.includes('/gsap/')) return 'vendor-animation'
          if (normalizedId.includes('/lucide-react/')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
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
