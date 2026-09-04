# vercel.json, explained

`vercel.json` cannot hold comments. This lived there as a `$comment` key until
Vercel's schema validation rejected it (`should NOT have additional property
"$comment"`) and failed every build before it started. Keep the notes here.

## Rewrite order matters

The rules are ordered and **the catch-all must stay last**, or every route below
it becomes `index.html`.

## `/story/:slug` is dynamic rendering, not a redirect

This is a client-rendered SPA, so a crawler that does not run JavaScript sees an
empty shell. Googlebot renders JS on a slow second pass; Bingbot, which is what
Edge search uses, largely does not. Crawler user-agents are therefore proxied to
the API, which returns the same story as server-rendered HTML.

Google supports this and does not treat it as cloaking **provided the served
content matches what a person sees**. That is a rule, not a detail: if the API
page and the SPA page ever diverge in substance, this becomes a penalty. The
long-term answer is SSR for public routes, which is a much larger job.

## `public/sitemap.xml` must not exist

Vercel resolves the filesystem before rewrites, so a static file at that path
silently wins and the dynamic sitemap never runs. The `/sitemap.xml` rewrite
points at `https://api.tripician.com/sitemap.xml`, served by `SitemapController`.

**This has already happened once.** A static 26-URL `public/sitemap.xml` with a
hardcoded `lastmod` was committed in `0b055f0`, which shadowed the dynamic one
and would have frozen the sitemap at that day's date while omitting every trip
and story page. If the sitemap ever looks stale again, look for that file before
looking anywhere else.
