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
 * We detect it and pass it as puppeteerExecutablePath so react-snap uses a
 * modern Chromium instead of its bundled ancient one.
 *
 * Locally (Windows/Mac dev): react-snap uses its bundled Chromium. If you
 * need to test prerendering locally, set CHROME_PATH env var to your Chrome
 * executable, e.g.:
 *   $env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
 *   npm run build
 */

const { execSync } = require('child_process');
const { run } = require('react-snap');
const fs = require('fs');
const path = require('path');

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
        const p = execSync(`which ${bin} 2>/dev/null`).toString().trim();
        if (p) return p;
      } catch {
        // not found, try next
      }
    }
  }

  // 3. Fall back to react-snap's bundled Chromium
  return undefined;
}

// Read blog slugs dynamically from blogs.json
const blogsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/assets/blogs/blogs.json'), 'utf-8')
);
const blogRoutes = blogsData.map((b) => `/blog/${b.slug}`);

const ROUTES = [
  '/',
  '/blog',
  '/about-us',
  '/terms-and-conditions',
  '/privacy-policy',
  '/get-help',
  '/contact-us',
  ...blogRoutes,
];

async function main() {
  const executablePath = detectChrome();

  if (executablePath) {
    console.log(`\n🌐 react-snap using Chrome at: ${executablePath}\n`);
  } else {
    console.log('\n🌐 react-snap using bundled Chromium\n');
  }

  console.log(`📄 Prerendering ${ROUTES.length} routes (${blogRoutes.length} blog posts + 7 static)\n`);

  await run({
    source: 'dist',
    include: ROUTES,
    crawl: false, // all routes are explicit — don't rely on link crawling
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    waitFor: 2000, // give React + Auth0 time to render
    minifyHtml: false,
    skipThirdPartyRequests: true,
    inlineCss: false,
    // react-snap's option name is puppeteerExecutablePath (NOT executablePath)
    ...(executablePath ? { puppeteerExecutablePath: executablePath } : {}),
  });
}

main().catch((err) => {
  console.error('❌ react-snap failed:', err);
  process.exit(1);
});

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
    // react-snap's option name is puppeteerExecutablePath (NOT executablePath)
    ...(executablePath ? { puppeteerExecutablePath: executablePath } : {}),
  });
}

main().catch((err) => {
  console.error('❌ react-snap failed:', err);
  process.exit(1);
});
