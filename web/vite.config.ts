import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["vitedefault.rubbishnetworkgoaway.uk"],
    proxy: {
      "/api": {
        target: "http://localhost:8699",
        changeOrigin: true,
      },
    },
  },
})
