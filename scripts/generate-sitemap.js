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
  { path: '/blog',                  priority: '0.9', changefreq: 'daily'   },
  { path: '/about-us',              priority: '0.6', changefreq: 'monthly' },
  { path: '/terms-and-conditions',  priority: '0.3', changefreq: 'monthly' },
  { path: '/privacy-policy',        priority: '0.3', changefreq: 'monthly' },
  { path: '/get-help',              priority: '0.4', changefreq: 'monthly' },
  { path: '/contact-us',            priority: '0.4', changefreq: 'monthly' },
];

const staticUrls = staticRoutes
  .map(
    (route) => `  <url>
    <loc>${base}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join('\n');

const blogUrls = blogs
  .map(
    (blog) => `  <url>
    <loc>${base}/blog/${blog.slug}</loc>
    <lastmod>${blog.updatedAt || blog.createdAt || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
</urlset>
`;

const outPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outPath, sitemap, 'utf-8');
console.log(`✅ sitemap.xml generated — ${blogs.length} blog entries + ${staticRoutes.length} static routes`);
