import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://<user>.github.io/programaciondeturnos/
export default defineConfig({
  base: '/programaciondeturnos/',
  plugins: [react()],
})
