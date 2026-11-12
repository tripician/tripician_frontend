import { describe, expect, it } from 'vitest';
import { FAQS, HERO, LANDING_DESCRIPTION, LANDING_TITLE, PILLARS, landingJsonLd } from './landingContent';
import { esc, fillIndexHtml, landingBody, toAppHtml } from './landingStatic';

const SHELL = `<!doctype html><html><head>
    <!--landing:social-->
    <!--landing:head-->
  </head><body><div id="root"><!--landing:body--></div><script type="module" src="/src/main.tsx"></script></body></html>`;

describe('the landing page as plain HTML', () => {
  const index = fillIndexHtml(SHELL, 'https://example.com/logo.png');

  it('gives crawlers that run no JavaScript the page itself: one h1, the copy and the questions', () => {
    const body = landingBody();
    expect(body.match(/<h1>/g)).toHaveLength(1);
    expect(body).toContain(`<h1>${esc(HERO.title.map((w) => w.text).join(' '))}</h1>`);
    for (const p of PILLARS) expect(body).toContain(esc(p.title));
    for (const f of FAQS) expect(body).toContain(`<h3>${esc(f.q)}</h3>`);
  });

  it('puts the title, share card, description, canonical and structured data in the head', () => {
    expect(index).toContain(`<title>${esc(LANDING_TITLE)}</title>`);
    expect(index).toContain(`<meta property="og:description" content="${esc(LANDING_DESCRIPTION)}" />`);
    expect(index).toContain('<link rel="canonical" href="https://tripician.com/" data-landing-static />');
    expect(index.match(/application\/ld\+json/g)).toHaveLength(landingJsonLd().length);
  });

  it('hides the static copy from browsers that run JavaScript before it can paint', () => {
    expect(index.indexOf("classList.add('js')")).toBeLessThan(index.indexOf('id="landing-static"'));
    expect(index).toContain('html.js #landing-static{display:none}');
  });

  it('marks every home-page-only tag so the app can remove it before React renders', () => {
    const head = index.slice(index.indexOf('<!--landing:head:start-->'), index.indexOf('<!--landing:head:end-->'));
    const tags = head.match(/<(script|style|meta|link)\b[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(3);
    for (const tag of tags) expect(tag).toContain('data-landing-static');
  });

  it('keeps every other path free of the home page, but keeps the share card', () => {
    const app = toAppHtml(index);
    expect(app).not.toContain('landing-static');
    expect(app).not.toContain('rel="canonical"');
    expect(app).not.toContain('application/ld+json');
    expect(app).toContain(`<title>${esc(LANDING_TITLE)}</title>`);
    expect(app).toContain('<div id="root"></div>');
  });

  it('refuses to build from an index.html that lost a marker', () => {
    expect(() => fillIndexHtml(SHELL.replace('<!--landing:body-->', ''))).toThrow(/landing:body/);
  });

  it('escapes text so copy can never break out of an attribute or a script', () => {
    expect(esc('"<a> & b"')).toBe('&quot;&lt;a&gt; &amp; b&quot;');
    for (const block of landingJsonLd('https://example.com/logo.png')) {
      expect(index).toContain(JSON.stringify(block).replace(/</g, '\\u003c'));
    }
  });

  it('describes Tripician the same way in the structured data as on the page', () => {
    const faq = landingJsonLd().find((b) => (b as { '@type': string })['@type'] === 'FAQPage') as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(FAQS.map((f) => f.q));
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(FAQS.map((f) => f.a));
  });
});
