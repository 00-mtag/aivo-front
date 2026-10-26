import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In development, requests to /api go to the Laravel server (php artisan serve), so no CORS setup is needed.
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
