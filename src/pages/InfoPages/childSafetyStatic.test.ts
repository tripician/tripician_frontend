import { describe, expect, it } from 'vitest';
import { fillIndexHtml, socialHead, toAppHtml } from '../LandingPage/landingStatic';
import {
  CHILD_SAFETY_DOC_TITLE,
  CHILD_SAFETY_EMAIL,
  CHILD_SAFETY_SECTIONS,
  PLAY_APP_NAME,
  PLAY_PACKAGE,
} from './childSafetyContent';
import { toChildSafetyHtml } from './childSafetyStatic';

const SHELL = `<!doctype html><html><head>
    <!--landing:social-->
    <!--landing:head-->
  </head><body><div id="root"><!--landing:body--></div><script type="module" src="/src/main.tsx"></script></body></html>`;

const appHtml = toAppHtml(fillIndexHtml(SHELL));
const page = toChildSafetyHtml(appHtml);
const text = page.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the Child Safety Standards as plain HTML (what Play review reads)', () => {
  it('carries the standards in the HTML itself, without JavaScript', () => {
    expect(page.match(/<h1>/g)).toHaveLength(1);
    expect(page).toContain('<h1>Child Safety Standards</h1>');
    for (const s of CHILD_SAFETY_SECTIONS) expect(page).toContain(`<h2>${s.title}</h2>`);
  });

  it('explicitly prohibits CSAE and names the app as published on Google Play', () => {
    expect(text).toContain('zero tolerance for child sexual abuse and exploitation (CSAE)');
    expect(text).toContain('Child sexual abuse material (CSAM)');
    expect(text).toContain(`${PLAY_APP_NAME} app on Google Play`);
    expect(text).toContain(PLAY_PACKAGE);
  });

  it('names the child safety point of contact as a working mailto link', () => {
    expect(text).toContain('child safety point of contact');
    expect(page).toContain(`href="mailto:${CHILD_SAFETY_EMAIL}?subject=Child%20Safety"`);
    expect(CHILD_SAFETY_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
  });

  it('has its own title, share card and canonical, not the home page ones', () => {
    expect(page).toContain(`<title>${CHILD_SAFETY_DOC_TITLE}</title>`);
    expect(page).toContain('<meta property="og:url" content="https://tripician.com/child-safety-standards" />');
    expect(page).toContain('<link rel="canonical" href="https://tripician.com/child-safety-standards" data-landing-static />');
    expect(page).not.toContain(socialHead());
  });

  it('marks every static tag so main.tsx removes it before React renders', () => {
    expect(page).toContain('<div id="static-page" data-landing-static>');
    expect(page.indexOf("classList.add('js')")).toBeLessThan(page.indexOf('id="static-page"'));
    expect(page).toContain('html.js #static-page{display:none}');
  });

  it('leaves the app shell otherwise intact', () => {
    expect(page).toContain('<script type="module" src="/src/main.tsx"></script>');
    expect(page).not.toContain('landing-static"');
  });

  it('refuses a shell it does not recognise instead of shipping an empty page', () => {
    expect(() => toChildSafetyHtml(appHtml.replace('<div id="root"></div>', '<div id="root">x</div>'))).toThrow();
  });
});
