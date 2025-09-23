import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enableNewsProxy = env.VITE_NEWS_PROXY === '1';
  return {
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
