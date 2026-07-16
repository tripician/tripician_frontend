/**
 * Client-side defenses for user-generated content.
 *
 * sanitizeHtml: allowlist sanitizer for rich-text notes (contentEditable
 * output). Strips every element/attribute outside a small formatting set, so
 * stored HTML from other users can never execute script in a viewer's browser.
 * Defense-in-depth - server-side sanitization remains the long-term home.
 *
 * safeExternalUrl: normalizes user-provided profile/social links so
 * window.open can never receive a javascript:/data: URI.
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'DIV', 'SPAN', 'P', 'UL', 'OL', 'LI', 'FONT',
]);

const ALLOWED_STYLES = new Set([
  'font-size', 'background-color', 'color', 'font-weight', 'font-style', 'text-decoration',
]);

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Snapshot before mutating: children unwrapped from removed nodes are
  // already in this list, so nothing escapes inspection.
  const elements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of elements) {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'style') {
        const safe = attr.value
          .split(';')
          .map((d) => d.trim())
          .filter((d) => {
            const prop = d.split(':')[0]?.trim().toLowerCase();
            return prop && ALLOWED_STYLES.has(prop) && !/url\s*\(|expression|javascript/i.test(d);
          })
          .join('; ');
        if (safe) el.setAttribute('style', safe);
        else el.removeAttribute('style');
      } else {
        el.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}

/** Returns an http(s) URL or null. Blocks javascript:, data:, and other schemes. */
export function safeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`;
  try {
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    return null;
  } catch {
    return null;
  }
}
