# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Tripician News Feature (Situational Focus)

The Create Trip workspace includes a `News` section focused on situational & safety updates (weather, disasters, travel restrictions, law/regulation changes) rather than business/market content. It shows:

- Top Stories (filtered situational articles)
- Latest list (non-business remainder)
- Trending (highest readership after filtering)
- Status & Rates panel (Weather + Currency) at the top-right
- Placeholder Sponsored (ad) card

### Environment Variable

Create a `.env.local` (ignored by git) with:

```
VITE_TWINGLY_API_KEY=your_api_key_here
# Optional: override fallback situational keywords (comma separated)
VITE_NEWS_DEFAULT_TERMS=weather,storm,law change,travel ban,restriction
```

Do NOT commit real keys. The client sends a POST request to `https://data.twingly.net/news/b/search/v1/search` with a country location filter. Default country is `us`; change via the `newsSlice.setLocation` action if needed.

### Development Notes

- API calls live in `src/services/APIs/news/newsService.ts`.
- Redux slice: `src/store/newsSlice.ts`.
- UI panel: `src/pages/CreateTripPage/NewsPanel.tsx`.
- The map and planning tabs are hidden while viewing News.
- Adjust fetch size or logic inside `newsSlice.loadNews` thunk (currently size=30) to modify density.

If the API key is missing, the News panel will show an error and a retry button once the key is supplied and dev server restarts.

If you do not supply any search keywords, a fallback situational list is used:
```
weather,storm,hurricane,flood,earthquake,wildfire,eruption,tsunami,restriction,travel ban,visa,law change,regulation,strike,protest,safety,alert
```
Override with `VITE_NEWS_DEFAULT_TERMS` (comma-separated) to refine.

### Filtering Rules

Articles containing business / finance oriented terms (e.g. `finance`, `market`, `stock`, `earnings`, `ipo`, `investment`, `merger`, `corporate`) in title / summary / section are dropped client-side. If every fetched article is filtered, a notice is shown.

### Weather & Currency

Weather data: Open-Meteo (no key). A representative coordinate per country code is used (extend `weatherService` map as needed).

Currency data: exchangerate.host (no key). Displays base currency (derived from country) vs a small set of majors (USD/EUR/GBP).

### CORS & Local Development

The Twingly endpoint does not include a permissive `Access-Control-Allow-Origin` header for arbitrary localhost origins, so direct browser calls can raise CORS errors.

To avoid this in local development you can enable a Vite proxy:

1. Add to your `.env.local`:
```
VITE_NEWS_PROXY=1
```
2. Restart `vite` dev server.

When `VITE_NEWS_PROXY=1`, requests go through `/twingly-news/...` which the dev server proxies to `https://data.twingly.net/...` (see `vite.config.ts`). In production builds the direct URL is used (proxy flag typically unset), and you should call the API from a backend if CORS remains restricted.

