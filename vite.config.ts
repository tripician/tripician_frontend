import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fillIndexHtml, toAppHtml } from './src/pages/LandingPage/landingStatic'

// The release version shown in the app ("Tripician v…") is package.json's, so a
// release bumps it in one place. It used to come from VITE_APP_VERSION, which
// had to be changed separately in every environment and was left at 3.0.0.
const appVersion: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

/**
 * The home page as plain HTML, for crawlers that never run JavaScript.
 *
 * Fills index.html's landing:* markers from the landing page's own copy (see
 * src/pages/LandingPage/landingStatic.ts for why), then writes app.html: the same
 * shell without the home-page-only parts, which vercel.json serves for every
 * other path. Runs in dev too, where the inline script hides the static copy.
 */
function landingStatic(logo?: string): Plugin {
  return {
    name: 'tripician-landing-static',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => fillIndexHtml(html, logo),
    },
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      const indexHtml = readFileSync(join(dir, 'index.html'), 'utf8')
      writeFileSync(join(dir, 'app.html'), toAppHtml(indexHtml))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The logo URL for the Organization record; the same value index.html's favicon uses.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
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
    plugins: [react(), landingStatic(env.VITE_TRIPICIAN_LOGO || undefined)],
  }
})
