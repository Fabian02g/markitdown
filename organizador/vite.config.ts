import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    // librerías en archivos aparte: al actualizar la app, el celular no vuelve a descargar todo
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['motion'],
          ui: ['@dnd-kit/core', 'date-fns', 'lucide-react', 'zustand', 'clsx'],
        },
      },
    },
  },
})
