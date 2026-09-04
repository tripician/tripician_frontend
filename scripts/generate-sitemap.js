import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const blogs = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/assets/blogs/blogs.json'), 'utf-8')
);

const base = 'https://tripician.com';
const today = new Date().toISOString().split('T')[0];

const staticRoutes = [
  { path: '/',                      priority: '1.0', changefreq: 'weekly'  },
  { path: '/community',             priority: '0.9', changefreq: 'daily'   },
  // /discover was dropped: it redirects to /community, and listing a redirect
  // in the sitemap is a crawl-budget own goal.
  { path: '/trips/looking-for-people', priority: '0.8', changefreq: 'daily' },
  { path: '/stories',               priority: '0.9', changefreq: 'daily'   },
  { path: '/posts',                 priority: '0.7', changefreq: 'hourly'  },
  { path: '/pricing',               priority: '0.7', changefreq: 'monthly' },
  { path: '/templates',             priority: '0.7', changefreq: 'weekly'  },
  { path: '/blog',                  priority: '0.9', changefreq: 'daily'   },
  { path: '/about-us',              priority: '0.6', changefreq: 'monthly' },
  // The business front door. Editing public/sitemap.xml by hand does nothing:
  // this script rewrites that file on every build.
  { path: '/for-operators',         priority: '0.6', changefreq: 'monthly' },
  { path: '/terms-and-conditions',  priority: '0.3', changefreq: 'monthly' },
  { path: '/privacy-policy',        priority: '0.3', changefreq: 'monthly' },
  { path: '/get-help',              priority: '0.4', changefreq: 'monthly' },
  { path: '/contact-us',            priority: '0.4', changefreq: 'monthly' },
];

const urlEntry = ({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const staticUrls = staticRoutes.map((r) =>
  urlEntry({ loc: `${base}${r.path}`, lastmod: today, changefreq: r.changefreq, priority: r.priority })
);

const blogUrls = blogs.map((blog) =>
  urlEntry({
    loc: `${base}/blog/${blog.slug}`,
    lastmod: blog.updatedAt || blog.createdAt || today,
    changefreq: 'monthly',
    priority: '0.8',
  })
);

/**
 * Published community trips are Tripician's largest organic-search surface -
 * each becomes an indexable itinerary landing page. Fetched from the public
 * API at build time; skipped gracefully when the API is unreachable (e.g.
 * offline CI) so the build never breaks.
 */
/** Minimal .env reader ,node scripts don't get Vite's env files for free. */
function readEnvApiBase() {
  if (process.env.SITEMAP_API_BASE) return process.env.SITEMAP_API_BASE;
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL;
  for (const file of ['.env.production', '.env.local', '.env']) {
    try {
      const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf-8');
      const match = text.match(/^\s*VITE_API_BASE_URL\s*=\s*(.+)\s*$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* file absent ,keep looking */ }
  }
  return undefined;
}

async function fetchPublishedTripUrls() {
  const apiBase = readEnvApiBase();
  if (!apiBase) {
    console.log('ℹ sitemap: no API base configured ,skipping published-trip URLs');
    return [];
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${apiBase.replace(/\/$/, '')}/api/trips/published`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const trips = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : [];
    // Slug logic mirrors src/utils/tripSlug.ts so sitemap URLs match page canonicals
    const slugify = (name) =>
      String(name || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
    return trips
      .map((t) => ({ id: t.id || t.Id, slug: slugify(t.name || t.Name) }))
      .filter((t) => Boolean(t.id))
      .map(({ id, slug }) =>
        urlEntry({
          loc: `${base}/trip/${slug && slug !== 'untitled-trip' ? `${slug}-` : ''}${id}`,
          lastmod: today,
          changefreq: 'weekly',
          priority: '0.7',
        })
      );
  } catch (err) {
    console.log(`ℹ sitemap: could not fetch published trips (${err.message}) ,continuing without them`);
    return [];
  }
}

/**
 * Published after stories. Unlike trips, a story carries a stored slug that
 * never changes after first publish, so the URL here is whatever the server
 * minted rather than something re-derived from the title. Same graceful skip
 * when the API is unreachable.
 */
async function fetchPublishedStoryUrls() {
  const apiBase = readEnvApiBase();
  if (!apiBase) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    // One large page rather than walking every page: the sitemap only needs the
    // stories worth crawling, and an unbounded loop against a growing feed is
    // how a build starts timing out.
    const resp = await fetch(`${apiBase.replace(/\/$/, '')}/api/stories/published?page=1&pageSize=48`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

    return items
      .map((s) => ({ slug: s.slug || s.Slug, id: s.id || s.Id, updated: s.updatedAt || s.UpdatedAt }))
      .filter((s) => Boolean(s.slug || s.id))
      .map(({ slug, id, updated }) =>
        urlEntry({
          loc: `${base}/story/${slug || id}`,
          lastmod: (updated || today).slice(0, 10),
          changefreq: 'monthly',
          priority: '0.7',
        })
      );
  } catch (err) {
    console.log(`ℹ sitemap: could not fetch published stories (${err.message}) ,continuing without them`);
    return [];
  }
}

/**
 * Traveller questions.
 *
 * The most indexable thing on the site: somebody searching "vietjet delay" is
 * asking exactly what a question here already answers. Each carries QAPage
 * structured data on its own page.
 */
async function fetchQuestionUrls() {
  const apiBase = readEnvApiBase();
  if (!apiBase) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${apiBase.replace(/\/$/, '')}/api/posts/questions?page=1&pageSize=48&sort=latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return items
      .map((q) => ({ id: q.id || q.Id, updated: q.lastActivityAt || q.createdAt }))
      .filter((q) => Boolean(q.id))
      .map(({ id, updated }) =>
        urlEntry({
          loc: `${base}/post/${id}`,
          lastmod: (updated || today).slice(0, 10),
          // A question changes when it is answered, which is often and unpredictable.
          changefreq: 'daily',
          priority: '0.6',
        })
      );
  } catch (err) {
    console.log(`ℹ sitemap: could not fetch questions (${err.message}) ,continuing without them`);
    return [];
  }
}

const tripUrls = await fetchPublishedTripUrls();
const storyUrls = await fetchPublishedStoryUrls();
const questionUrls = await fetchQuestionUrls();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls, ...tripUrls, ...storyUrls].join('\n')}
</urlset>
`;

const outPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outPath, sitemap, 'utf-8');
console.log(
  `✅ sitemap.xml generated ,${staticRoutes.length} static + ${blogs.length} blog + ${tripUrls.length} trip + ${storyUrls.length} story + ${questionUrls.length} question URLs`
);
