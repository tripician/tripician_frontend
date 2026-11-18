/**
 * /child-safety-standards as plain HTML, written at build time.
 *
 * Why it exists: Google Play's Child Safety Standards declaration links here,
 * and Play rejected an update on November 18, 2026 under that policy. The site is
 * a single-page app, so without this the server sent every visitor, reviewer and
 * crawler the same empty <div id="root"> with the home page's title, and
 * anything that did not run JavaScript found no standards, no CSAE prohibition
 * and no point of contact. This writes the page's own words (from
 * childSafetyContent.ts) into the HTML.
 *
 * vite.config.ts writes the result to dist/child-safety-standards.html, and
 * vercel.json rewrites /child-safety-standards to it ahead of the app.html
 * catch-all. Browsers that run JavaScript hide the copy at once (the inline
 * script adds `js` to <html>), main.tsx removes everything marked
 * data-landing-static, and React renders the designed page.
 *
 * Plain TypeScript with no browser or Vite APIs, because vite.config.ts imports it.
 */
import { SITE_URL } from '../LandingPage/landingContent';
import { esc, socialHead } from '../LandingPage/landingStatic';
import {
  CHILD_SAFETY_DESCRIPTION,
  CHILD_SAFETY_DOC_TITLE,
  CHILD_SAFETY_INTRO,
  CHILD_SAFETY_PATH,
  CHILD_SAFETY_SECTIONS,
  CHILD_SAFETY_TITLE,
  CHILD_SAFETY_UPDATED,
  type Block,
  type Inline,
} from './childSafetyContent';

/** The built file vercel.json serves for CHILD_SAFETY_PATH. */
export const CHILD_SAFETY_FILE = 'child-safety-standards.html';

const URL_ = `${SITE_URL}${CHILD_SAFETY_PATH}`;

function inline(part: Inline): string {
  if (typeof part === 'string') return esc(part);
  if ('strong' in part) return `<strong>${esc(part.strong)}</strong>`;
  return `<a href="${esc(part.href)}">${esc(part.text)}</a>`;
}

const runs = (parts: Inline[]) => parts.map(inline).join('');

function block(b: Block): string {
  if ('p' in b) return `<p>${runs(b.p)}</p>`;
  return `<ul>${b.ul.map((item) => `<li>${runs(item)}</li>`).join('')}</ul>`;
}

/** Head tags for this page only; each is removed by main.tsx before React renders. */
export function childSafetyHead(): string {
  return [
    `<script data-landing-static>document.documentElement.classList.add('js')</script>`,
    `<style data-landing-static>`,
    `html.js #static-page{display:none}`,
    `#static-page{max-width:760px;margin:0 auto;padding:24px 16px 64px;font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1c21}`,
    `#static-page h1{font-size:2.2rem;line-height:1.15;margin:.3em 0}`,
    `#static-page h2{font-size:1.35rem;margin:1.8em 0 .4em}`,
    `#static-page a{color:#a8001f}`,
    `#static-page li{margin:.3em 0}`,
    `</style>`,
    `<meta name="description" content="${esc(CHILD_SAFETY_DESCRIPTION)}" data-landing-static />`,
    `<link rel="canonical" href="${esc(URL_)}" data-landing-static />`,
  ].join('\n    ');
}

/** The standards as a document: one h1, a heading per section, real links. */
export function childSafetyBody(): string {
  const year = new Date().getFullYear();
  const sections = CHILD_SAFETY_SECTIONS.map(
    (s) => `<section>
          <h2>${esc(s.title)}</h2>
          ${s.blocks.map(block).join('\n          ')}
        </section>`,
  ).join('\n        ');

  return `<div id="static-page" data-landing-static>
      <header><p><a href="/"><strong>Tripician</strong></a></p></header>
      <main>
        <p>Tripician safety</p>
        <h1>${esc(CHILD_SAFETY_TITLE)}</h1>
        <p>${esc(CHILD_SAFETY_INTRO)}</p>
        ${sections}
        <p>Last updated: ${esc(CHILD_SAFETY_UPDATED)}</p>
      </main>
      <footer>
        <p><a href="/terms-and-conditions">Terms of Service</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/contact-us">Contact</a></p>
        <p>&copy; ${year} Tripician. All rights reserved.</p>
      </footer>
    </div>`;
}

/**
 * app.html with this page's title, share card, description, canonical and copy.
 * Throws if the shell has changed shape, so a build can never ship this page
 * empty or with the home page's title without anyone noticing.
 */
export function toChildSafetyHtml(appHtml: string): string {
  const homeSocial = socialHead();
  const root = '<div id="root"></div>';
  if (!appHtml.includes(homeSocial)) throw new Error('app.html is missing the share-card tags');
  if (!appHtml.includes(root)) throw new Error('app.html is missing an empty <div id="root">');
  if (!appHtml.includes('</head>')) throw new Error('app.html is missing </head>');

  // Function replacers, so a "$" in the copy is never read as a replacement pattern.
  return appHtml
    .replace(homeSocial, () => socialHead({ title: CHILD_SAFETY_DOC_TITLE, description: CHILD_SAFETY_DESCRIPTION, url: URL_ }))
    .replace('</head>', () => `    ${childSafetyHead()}\n  </head>`)
    .replace(root, () => `<div id="root">${childSafetyBody()}</div>`);
}
