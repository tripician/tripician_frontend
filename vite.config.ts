import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // Strip ALL console output and debugger statements from production bundles
    // (applies to app code and bundled dependencies alike).
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // A group here gathers every module of its libraries that ANY page uses into
          // one file, and that file downloads whenever ANY of it is needed. So group
          // only libraries every page needs anyway. Listing gsap beside framer-motion
          // put the landing page's animation library on every page, and a group for
          // MUI shipped every component the app uses to every page (measured: 58-156
          // KB more per page). Left out, the build splits them by actual use.
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-auth':   ['@auth0/auth0-react'],
            'vendor-redux':  ['@reduxjs/toolkit', 'react-redux'],
            'vendor-map':    ['mapbox-gl'],
            // Not needed at startup, but 47 page bundles use it, so one shared file.
            'vendor-motion': ['framer-motion'],
            'vendor-media':  ['canvas-confetti'],
            'vendor-misc':   ['axios', 'dayjs'],
          },
        },
      },
    },
    plugins: [react()],
  }
})
