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

## Floating Dock Feedback & Updates

The application includes a floating dock (above the chat assistant) with two actions:

- `Feedback` – opens a dialog for users to submit feedback.
- `Updates` – shows the current version and a list of recent feature highlights.

### Environment Variables

Add these to a `.env` (or `.env.local`) file at the project root:

```
VITE_FEEDBACK_EMAIL=tripicianofficial@gmail.com
# Optional: if provided, feedback will be POSTed instead of opening the user's mail client.
VITE_FEEDBACK_ENDPOINT=https://api.example.com/feedback
```

Behavior:
- If `VITE_FEEDBACK_ENDPOINT` is not set, clicking `Send` in the feedback dialog triggers a `mailto:` link to `VITE_FEEDBACK_EMAIL` (or the default fallback `tripicianofficial@gmail.com`).
- If `VITE_FEEDBACK_ENDPOINT` is set, a JSON POST `{ subject, message }` is sent. The endpoint should return a 2xx status on success.

### Version Display
The Updates dialog reads the app version from `package.json` (enabled via `resolveJsonModule` in `tsconfig.app.json`). Update the `version` field there to reflect releases.

### Customizing the Feature List
Edit `latestFeatures` inside `src/components/FloatingDock.tsx` to adjust the changelog bullets or migrate to a remote fetch in the future.
