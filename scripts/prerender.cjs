'use strict';

/**
 * Custom react-snap wrapper.
 *
 * Problem: react-snap bundles Puppeteer v1.20.0 whose Chromium is ~v79.
 * Chrome 80 introduced optional chaining (?.) — Vite's output uses it, so
 * react-snap's built-in Chromium throws "SyntaxError: Unexpected token '?'"
 * and snaps empty HTML shells instead of real content.
 *
 * Fix: on CI (GitHub Actions ubuntu-latest), Google Chrome is pre-installed.
 * We detect it and pass it as executablePath so react-snap uses a modern
 * Chromium instead of its bundled ancient one.
 *
 * Locally (Windows/Mac dev): react-snap uses its bundled Chromium. If you
 * need to test prerendering locally, set CHROME_PATH env var to your Chrome
 * executable, e.g.:
 *   $env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
 *   npm run build
 */

const { execSync } = require('child_process');
const { run } = require('react-snap');

function detectChrome() {
  // 1. Explicit override via env var (works on any OS)
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  // 2. Auto-detect on Linux CI (GitHub Actions ubuntu-latest has Chrome pre-installed)
  if (process.platform === 'linux') {
    const candidates = [
      'google-chrome-stable',
      'google-chrome',
      'chromium-browser',
      'chromium',
    ];
    for (const bin of candidates) {
      try {
        const path = execSync(`which ${bin} 2>/dev/null`).toString().trim();
        if (path) return path;
      } catch {
        // not found, try next
      }
    }
  }

  // 3. Fall back to react-snap's bundled Chromium
  return undefined;
}

async function main() {
  const executablePath = detectChrome();

  if (executablePath) {
    console.log(`\n🌐 react-snap using Chrome at: ${executablePath}\n`);
  } else {
    console.log('\n🌐 react-snap using bundled Chromium\n');
  }

  await run({
    source: 'dist',
    include: [
      '/',
      '/blog',
      '/about-us',
      '/terms-and-conditions',
      '/privacy-policy',
      '/get-help',
      '/contact-us',
    ],
    crawl: true,
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    minifyHtml: false,
    skipThirdPartyRequests: true,
    inlineCss: false,
    ...(executablePath ? { executablePath } : {}),
  });
}

main().catch((err) => {
  console.error('❌ react-snap failed:', err);
  process.exit(1);
});
