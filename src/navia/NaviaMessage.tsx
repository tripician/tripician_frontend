import React from 'react';
import type { NaviaMessage as NaviaMessageType } from './useNavia';
import NaviaOrb from './NaviaOrb';

interface NaviaMessageProps {
  message: NaviaMessageType;
  isLight: boolean;
}

/** Inline pass: **bold** / __bold__ segments */
function renderInline(content: string, keyPrefix: string): React.ReactNode[] {
  const parts = content.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, pi) => {
    if (/^\*\*(.+)\*\*$/.test(part) || /^__(.+)__$/.test(part)) {
      return <strong key={`${keyPrefix}-${pi}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Lightweight markdown renderer (no deps, React elements only — streaming-safe
 * since it works line by line). The prompt bans tables/headings, but the model
 * can still slip; everything degrades to something readable:
 *  - #-headings → bold block lines
 *  - numbered lists → bullet-style rows keeping their number
 *  - table separator rows (|---|---|) → dropped
 *  - table data rows → "**first cell** · rest · of · cells" lines
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    // Table separator row: only pipes / dashes / colons / spaces — pure noise.
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

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = bulletMatch ? null : line.match(/^(\d+)[.)]\s+(.*)$/);
    const isListItem = !!bulletMatch || !!numberedMatch;
    const marker = bulletMatch ? '•' : numberedMatch ? `${numberedMatch[1]}.` : '';
    const content = bulletMatch ? bulletMatch[1] : numberedMatch ? numberedMatch[2] : line;

    const rendered = renderInline(content, String(li));

    if (isListItem) {
      nodes.push(
        <span
          key={li}
          style={{
            display: 'block',
            paddingLeft: marker.length > 1 ? 22 : 14,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 2,
            }}
          >
            {marker}
          </span>
          {rendered}
        </span>
      );
    } else {
      nodes.push(
        <span
          key={li}
          style={{
            display: li === 0 ? 'inline' : 'block',
          }}
        >
          {rendered}
        </span>
      );
    }
  });

  return nodes;
}

const NaviaMessageComponent: React.FC<NaviaMessageProps> = ({
  message,
  isLight,
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {!isUser && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            paddingLeft: 2,
          }}
        >
          <NaviaOrb size={22} processing={message.isStreaming} />

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isLight
                ? '#4b5563'
                : 'rgba(255,255,255,0.75)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Navia
          </span>
        </div>
      )}

      <div
        style={{
          padding: '10px 14px',
          maxWidth: isUser ? '75%' : '85%',
          borderRadius: isUser
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',

          background: isUser
            ? 'linear-gradient(135deg,#FF385C,#D91A50)'
            : isLight
            ? '#FFFFFF'
            : 'rgba(255,255,255,0.05)',

          color: isUser
            ? '#fff'
            : isLight
            ? '#1f2937'
            : 'rgba(255,255,255,0.88)',

          border: isUser
            ? 'none'
            : `1px solid ${
                isLight
                  ? 'rgba(0,0,0,0.06)'
                  : 'rgba(255,255,255,0.08)'
              }`,

          boxShadow: isUser
            ? '0 8px 24px rgba(232,67,106,0.22)'
            : isLight
            ? '0 2px 10px rgba(0,0,0,0.04)'
            : 'none',

          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {renderMarkdown(message.content)}

        {message.isStreaming && (
          <span
            className="navia-cursor"
            style={{
              display: 'inline-block',
              marginLeft: 2,
              fontWeight: 500,
            }}
          >
            ▋
          </span>
        )}
      </div>
    </div>
  );
};

export default NaviaMessageComponent;