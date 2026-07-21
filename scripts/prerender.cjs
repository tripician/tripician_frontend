'use strict';

/**
 * Custom react-snap wrapper.
 *
 * Problem: react-snap bundles Puppeteer v1.20.0 whose Chromium is ~v79.
 * Chrome 80 introduced optional chaining (?.) ,Vite's output uses it, so
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
const os = require('os');
const net = require('net');

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

  // 3. Auto-detect common Chrome install paths on Windows
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 4. Fall back to react-snap's bundled Chromium
  return undefined;
}

function acquireLock(lockPath) {
  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, String(process.pid));
    return fd;
  } catch {
    return null;
  }
}

function releaseLock(fd, lockPath) {
  if (typeof fd === 'number') {
    try { fs.closeSync(fd); } catch {}
    try { fs.unlinkSync(lockPath); } catch {}
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function findPort(startPort) {
  let port = startPort;
  for (let i = 0; i < 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) return port;
    port += 1;
  }
  return startPort;
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
  const lockPath = path.join(os.tmpdir(), 'tripician-react-snap.lock');
  const lockFd = acquireLock(lockPath);
  if (lockFd === null) {
    console.log('\n⚠️ prerender already running (lock present); skipping duplicate invocation\n');
    process.exit(0);
  }

  const executablePath = detectChrome();

  if (executablePath) {
    console.log(`\n🌐 react-snap using Chrome at: ${executablePath}\n`);
  } else {
    console.log('\n🌐 react-snap using bundled Chromium\n');
  }

  console.log(`📄 Prerendering ${ROUTES.length} routes (${blogRoutes.length} blog posts + 7 static)\n`);

  const port = await findPort(45679);

  if (port !== 45679) {
    console.log(`⚠️ Port 45679 busy, using ${port} for prerender\n`);
  }

  try {
    await run({
      source: 'dist',
      port,
      include: ROUTES,
      crawl: false, // all routes are explicit ,don't rely on link crawling
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
  } finally {
    releaseLock(lockFd, lockPath);
  }
}

main().catch((err) => {
  console.error('❌ react-snap failed:', err);
  process.exit(1);
});
