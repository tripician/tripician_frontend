/**
 * The landing page as plain HTML, written into index.html at build time.
 *
 * Why it exists: the site is a single-page app, so the HTML a server sends for
 * "/" was an empty <div id="root">. Search engines that run JavaScript coped;
 * most AI crawlers (GPTBot, ClaudeBot, PerplexityBot and others) do not run it,
 * so they saw a title and nothing else, and could not describe or recommend
 * Tripician. This writes the same words the page shows, from landingContent.ts,
 * as real headings, paragraphs and links.
 *
 * How it stays honest: it is the page's own copy, not a second pitch for bots.
 * Browsers that run JavaScript hide it at once (an inline script adds `js` to
 * <html>) and React replaces it when it mounts, so people see the designed page
 * and crawlers see the same content as text.
 *
 * Only "/" gets it. vite.config.ts writes app.html without these blocks, and
 * vercel.json serves app.html for every other path, so /pricing does not look
 * like the home page to a crawler.
 *
 * Plain TypeScript with no browser or Vite APIs, because vite.config.ts imports it.
 */
import {
  AI,
  BUSINESS,
  CTA,
  FAQ_HEAD,
  FAQS,
  FOOTER,
  HERO,
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  NAV_LINKS,
  PILLARS,
  PILLARS_HEAD,
  PLANS,
  SITE_URL,
  STEPS,
  STEPS_HEAD,
  TRUST,
  landingJsonLd,
} from './landingContent';

/** Text and attribute values. Every string from landingContent passes through this. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON inside a <script>: '<' escaped so no string can close the tag. */
function jsonScript(block: object): string {
  return `<script type="application/ld+json" data-landing-static>${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`;
}

const link = (href: string, label: string) => `<a href="${esc(href)}">${esc(label)}</a>`;

/**
 * Title and share-card tags. These go on EVERY page (index.html and app.html):
 * WhatsApp, Facebook and LinkedIn never run JavaScript, so per-page tags written
 * by React never reach them and these are all they ever read.
 */
export function socialHead(): string {
  const image = `${SITE_URL}/og-cover.jpg`;
  return [
    `<title>${esc(LANDING_TITLE)}</title>`,
    `<meta property="og:title" content="${esc(LANDING_TITLE)}" />`,
    `<meta property="og:description" content="${esc(LANDING_DESCRIPTION)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${SITE_URL}/" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Tripician" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(LANDING_TITLE)}" />`,
    `<meta name="twitter:description" content="${esc(LANDING_DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ');
}

/**
 * Home-page-only head: description, canonical, structured data, and the switch
 * that hides the static body from browsers that run JavaScript.
 *
 * Every tag carries `data-landing-static`, and main.tsx removes them before React
 * renders, so the page's own <Seo> is then the only description, canonical and
 * JSON-LD in the document and nothing is ever doubled.
 */
export function landingHead(logo?: string): string {
  return [
    // First, so the static body never paints for anyone who runs JavaScript.
    `<script data-landing-static>document.documentElement.classList.add('js')</script>`,
    `<style data-landing-static>`,
    `html.js #landing-static{display:none}`,
    `#landing-static{max-width:760px;margin:0 auto;padding:24px 16px 64px;font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1c21}`,
    `#landing-static h1{font-size:2.4rem;line-height:1.1;margin:.4em 0}`,
    `#landing-static h2{font-size:1.5rem;margin:2em 0 .4em}`,
    `#landing-static h3{font-size:1.05rem;margin:1.2em 0 .2em}`,
    `#landing-static a{color:#a8001f}`,
    `#landing-static nav a{margin-right:14px}`,
    `</style>`,
    `<meta name="description" content="${esc(LANDING_DESCRIPTION)}" data-landing-static />`,
    `<link rel="canonical" href="${SITE_URL}/" data-landing-static />`,
    ...landingJsonLd(logo).map(jsonScript),
  ].join('\n    ');
}

/** The page, as a document: one h1, a heading per section, real links. */
export function landingBody(): string {
  const headline = HERO.title.map((w) => w.text).join(' ');
  const year = new Date().getFullYear();

  const sections = [
    `<header>
        <p><a href="/"><strong>Tripician</strong></a></p>
        <nav aria-label="Main">${NAV_LINKS.map((l) => link(l.href, l.label)).join(' ')} ${link('/signin', 'Sign in')} ${link('/signup', HERO.secondaryCta)}</nav>
      </header>`,
    `<main>
      <section>
        <p>${esc(HERO.eyebrow)}</p>
        <h1>${esc(headline)}</h1>
        <p>${esc(HERO.subtitle)}</p>
        <p>${link('/stories', HERO.primaryCta)} · ${link('/signup', HERO.secondaryCta)}</p>
        <ul>${TRUST.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>
      <section>
        <p>${esc(PILLARS_HEAD.kicker)}</p>
        <h2>${esc(PILLARS_HEAD.title)}</h2>
        <p>${esc(PILLARS_HEAD.lede)}</p>
        ${PILLARS.map((p) => `<h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>`).join('\n        ')}
        <p>${link('/stories', 'Stories & itineraries')} · ${link('/posts?kind=questions', 'Travel questions')} · ${link('/stories?kind=groups', 'Travel groups')}</p>
      </section>
      <section>
        <p>Tripician Intelligence</p>
        <h2>${esc(AI.title)}</h2>
        ${AI.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <p>${esc(AI.caveat)}</p>
      </section>
      <section>
        <p>${esc(STEPS_HEAD.kicker)}</p>
        <h2>${esc(STEPS_HEAD.title)}</h2>
        <p>${esc(STEPS_HEAD.lede)}</p>
        <ol>${STEPS.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></li>`).join('')}</ol>
      </section>
      <section>
        <p>${esc(PLANS.kicker)}</p>
        <h2>${esc(PLANS.title)}</h2>
        <ul>${PLANS.items.map((p) => `<li><strong>${esc(p.name)}</strong> (${esc(p.tag)}): ${esc(p.desc)}</li>`).join('')}</ul>
        <p>${link('/pricing', PLANS.more)}</p>
      </section>
      <section>
        <p>${esc(BUSINESS.kicker)}</p>
        <h2>${esc(BUSINESS.title)}</h2>
        <p>${esc(BUSINESS.lede)}</p>
        <p>${link('/for-operators', BUSINESS.cta)}</p>
      </section>
      <section>
        <p>${esc(FAQ_HEAD.kicker)}</p>
        <h2>${esc(FAQ_HEAD.title)}</h2>
        ${FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n        ')}
      </section>
      <section>
        <h2>${esc(CTA.title)}</h2>
        <p>${esc(CTA.sub)}</p>
        <p>${link('/signup', CTA.primary)} · ${link('/stories', CTA.alt)}</p>
      </section>
    </main>`,
    `<footer>
        <p>${esc(FOOTER.blurb)}</p>
        ${FOOTER.columns
          .map((c) => `<nav aria-label="${esc(c.title)}"><h2>${esc(c.title)}</h2><ul>${c.links.map((l) => `<li>${link(l.href, l.label)}</li>`).join('')}</ul></nav>`)
          .join('\n        ')}
        <p>${esc(FOOTER.note)}</p>
        <p>&copy; ${year} Tripician. All rights reserved.</p>
      </footer>`,
  ];

  return `<div id="landing-static" data-landing-static>\n      ${sections.join('\n      ')}\n    </div>`;
}

/** Marker comments in index.html, and the regions the build strips for app.html. */
export const MARKERS = {
  social: '<!--landing:social-->',
  head: '<!--landing:head-->',
  body: '<!--landing:body-->',
} as const;

const region = (name: 'head' | 'body', html: string) =>
  `<!--landing:${name}:start-->\n    ${html}\n    <!--landing:${name}:end-->`;

/** Fills index.html's markers. Throws if one is missing, so a build can never ship an empty home page silently. */
export function fillIndexHtml(html: string, logo?: string): string {
  for (const marker of Object.values(MARKERS)) {
    if (!html.includes(marker)) throw new Error(`index.html is missing ${marker}`);
  }
  return html
    .replace(MARKERS.social, socialHead())
    .replace(MARKERS.head, region('head', landingHead(logo)))
    .replace(MARKERS.body, region('body', landingBody()));
}

/** index.html minus the home-page-only regions: the shell every other path is served. */
export function toAppHtml(indexHtml: string): string {
  const stripped = indexHtml.replace(/<!--landing:(head|body):start-->[\s\S]*?<!--landing:\1:end-->/g, '');
  if (stripped.includes('landing-static')) throw new Error('app.html still carries the landing page');
  return stripped;
}
