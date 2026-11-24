// Runs on Vercel just before `npm install` (vercel.json installCommand).
//
// @tripician/graphics comes from the org's private GitHub Packages registry,
// and .npmrc sends it the token in TRIPICIAN_PACKAGES_TOKEN. When that token is
// missing or wrong, npm only says "401 Unauthorized". This says which it is and
// what to fix. It never prints the token, only its length and its first four
// characters ("ghp_" for every classic GitHub token).
//
// Locally: node scripts/check-packages-token.mjs

const NAME = 'TRIPICIAN_PACKAGES_TOKEN';
const PACKAGE_URL = 'https://npm.pkg.github.com/@tripician%2fgraphics';

const where = process.env.VERCEL
  ? `this Vercel ${process.env.VERCEL_ENV ?? ''} build (${process.env.VERCEL_URL ?? 'unknown project'})`
  : 'this machine';
const fixOnVercel =
  `In this Vercel project: Settings -> Environment Variables -> ${NAME}, enabled for ` +
  `${process.env.VERCEL_ENV === 'production' ? 'Production' : 'Preview'}, then Redeploy.`;
const fix = process.env.VERCEL ? fixOnVercel : `Set the user environment variable ${NAME} and restart the terminal.`;

function fail(message) {
  console.error(`\n[packages token] ${message}\n[packages token] ${fix}\n`);
  process.exit(1);
}

const token = process.env[NAME];
if (!token) fail(`${NAME} is not set for ${where}, so @tripician/graphics cannot be installed.`);

const shape = `${token.length} characters, starts with "${token.slice(0, 4)}"`;
if (token !== token.trim() || /^["']|["']$/.test(token)) {
  fail(`${NAME} is set for ${where} (${shape}) but has spaces, a line break or quotes around it. Paste the bare token.`);
}
if (!token.startsWith('ghp_')) {
  console.warn(`[packages token] ${NAME} (${shape}) does not look like a classic GitHub token (ghp_...).`);
}

let status;
try {
  const response = await fetch(PACKAGE_URL, { headers: { Authorization: `Bearer ${token}` } });
  status = response.status;
  // Only the status matters; an unread body keeps the connection (and Node) alive.
  await response.body?.cancel().catch(() => {});
} catch (error) {
  // Can't reach GitHub from here: let npm try and report for itself.
  console.warn(`[packages token] could not reach GitHub Packages to check the token (${error.message}); trying the install anyway.`);
  process.exit(0);
}

if (status === 401 || status === 403) {
  fail(
    `${NAME} is set for ${where} (${shape}), but GitHub rejects it (HTTP ${status}): ` +
      'the value is not the right token, or it was revoked, expired or lacks read:packages.',
  );
}
if (status !== 200) {
  console.warn(`[packages token] GitHub Packages answered HTTP ${status} for the token check; trying the install anyway.`);
  process.exit(0);
}
console.log(`[packages token] ${NAME} is set for ${where} (${shape}) and GitHub accepts it.`);
process.exit(0);
