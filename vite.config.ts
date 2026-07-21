import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enableNewsProxy = env.VITE_NEWS_PROXY === '1';
  return {
    // Strip ALL console output and debugger statements from production bundles
    // (applies to app code and bundled dependencies alike).
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-auth':   ['@auth0/auth0-react'],
            'vendor-redux':  ['@reduxjs/toolkit', 'react-redux'],
            'vendor-ui':     ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'vendor-map':    ['mapbox-gl'],
            'vendor-motion': ['framer-motion', 'gsap'],
            'vendor-query':  ['@tanstack/react-query'],
            'vendor-media':  ['react-barcode', 'canvas-confetti'],
            'vendor-misc':   ['axios', 'date-fns', 'dayjs', 'lucide-react'],
          },
        },
      },
    },
    plugins: [react()],
    server: enableNewsProxy ? {
      proxy: {
        '/twingly-news': {
          target: 'https://data.twingly.net',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/twingly-news/, ''),
          // No extra proxy configuration currently needed
        }
      }
    } : undefined
  }
})
