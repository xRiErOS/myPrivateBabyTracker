import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5555,
    proxy: {
      '/api': 'http://localhost:5556',
      '/uploads': 'http://localhost:5556',
      '/ws': { target: 'ws://localhost:5556', ws: true },
    },
  },
})
