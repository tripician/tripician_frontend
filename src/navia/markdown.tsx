/**
 * Lightweight markdown renderer for chat text (no deps, React elements only,
 * streaming-safe since it works line by line).
 *
 * Shared by the Navia orb panel and the trip chat, so a model reply reads the
 * same wherever it lands. The prompt bans tables/headings, but the model can
 * still slip; everything degrades to something readable:
 *  - #-headings → bold block lines
 *  - numbered lists → bullet-style rows keeping their number
 *  - table separator rows (|---|---|) → dropped
 *  - table data rows → "**first cell** · rest · of · cells" lines
 *
 * Never renders HTML: every span is a React element, so a reply containing
 * markup is text, not DOM.
 */
import React from 'react';
import { safeExternalUrl } from '../utils/sanitizeHtml';

/**
 * One pass over a line's inline spans. Bold is matched before italic so
 * `**text**` is not read as an empty italic wrapping `*text*`.
 */
const INLINE_RE = /(\[[^\]\n]+\]\([^)\s]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

const CODE_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.92em',
  background: 'rgba(128,128,128,0.18)',
  borderRadius: 4,
  padding: '0 4px',
};

export function renderInline(content: string, keyPrefix: string): React.ReactNode[] {
  return content.split(INLINE_RE).map((part, pi) => {
    const key = `${keyPrefix}-${pi}`;
    if (!part) return null;

    const link = part.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeExternalUrl(link[2]);
      // A link we cannot vouch for degrades to its own label, never to a
      // clickable javascript:/data: URL.
      if (!href) return <React.Fragment key={key}>{link[1]}</React.Fragment>;
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          {link[1]}
        </a>
      );
    }

    if (/^\*\*[^*\n]+\*\*$/.test(part) || /^__[^_\n]+__$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*\n]+\*$/.test(part) || /^_[^_\n]+_$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (/^`[^`\n]+`$/.test(part)) {
      return <code key={key} style={CODE_STYLE}>{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    // Blank line: a paragraph break. The line-splitting below drops the newline
    // characters themselves, so without this the gap the model wrote disappears.
    if (!line.trim()) {
      if (li > 0) nodes.push(<span key={li} style={{ display: 'block', height: '0.55em' }} />);
      return;
    }

    // Table separator row: only pipes / dashes / colons / spaces, pure noise.
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-') && line.includes('|')) {
      return;
    }

    // Table row: split cells, first cell bold, rest joined with a middot.
    const pipeCount = (line.match(/\|/g) || []).length;
    if (pipeCount >= 2) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length === 0) return;
      nodes.push(
        <span key={li} style={{ display: 'block', marginTop: 2 }}>
          <strong>{renderInline(cells[0], `${li}-c0`)}</strong>
          {cells.slice(1).map((cell, ci) => (
            <React.Fragment key={`${li}-c${ci + 1}`}>
              {' · '}
              {renderInline(cell, `${li}-c${ci + 1}`)}
            </React.Fragment>
          ))}
        </span>
      );
      return;
    }

    // Heading: strip the hashes, render as a bold block line.
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      nodes.push(
        <strong key={li} style={{ display: 'block', marginTop: li === 0 ? 0 : 8 }}>
          {renderInline(headingMatch[1], `${li}-h`)}
        </strong>
      );
      return;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const numberedMatch = bulletMatch ? null : line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const isListItem = !!bulletMatch || !!numberedMatch;
    const marker = bulletMatch ? '•' : numberedMatch ? `${numberedMatch[1]}.` : '';
    const content = bulletMatch ? bulletMatch[1] : numberedMatch ? numberedMatch[2] : line;

    const rendered = renderInline(content, String(li));

    if (isListItem) {
      nodes.push(
        <span
          key={li}
          style={{ display: 'block', paddingLeft: marker.length > 1 ? 22 : 14, position: 'relative' }}
        >
          <span style={{ position: 'absolute', left: 2 }}>{marker}</span>
          {rendered}
        </span>
      );
    } else {
      nodes.push(
        <span key={li} style={{ display: li === 0 ? 'inline' : 'block' }}>
          {rendered}
        </span>
      );
    }
  });

  return nodes;
}
