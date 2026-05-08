import React from 'react';
import type { NaviaMessage as NaviaMessageType } from './useNavia';

interface NaviaMessageProps {
  message: NaviaMessageType;
  isLight: boolean;
}

/** Lightweight markdown renderer — bold, bullets, line breaks. No external deps. */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    const isBullet = /^[-*]\s+/.test(line);
    const content = isBullet ? line.replace(/^[-*]\s+/, '') : line;

    // Bold: **text** or __text__
    const parts = content.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
    const rendered = parts.map((part, pi) => {
      if (/^\*\*(.+)\*\*$/.test(part)) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      }
      if (/^__(.+)__$/.test(part)) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      nodes.push(
        <span key={li} style={{ display: 'block', paddingLeft: 12, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 2 }}>•</span>
          {rendered}
        </span>,
      );
    } else {
      nodes.push(<span key={li} style={{ display: li === 0 ? 'inline' : 'block' }}>{rendered}</span>);
    }
  });

  return nodes;
}

const NaviaMessageComponent: React.FC<NaviaMessageProps> = ({ message, isLight }) => {
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
            gap: 4,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 5,
              background: 'linear-gradient(135deg,#FF385C,#D91A50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="9" height="9">
              <path
                fill="#fff"
                d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 12a1 1 0 110 2 1 1 0 010-2zm.5-8v6h-1V8h1z"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: '#FF385C',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            Navia
          </span>
        </div>
      )}

      <div
        style={{
          padding: '8px 12px',
          maxWidth: isUser ? '75%' : '85%',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          fontSize: 13,
          lineHeight: 1.65,
          fontFamily: 'inherit',
          background: isUser
            ? '#e8436a'
            : isLight
            ? '#f4f4f4'
            : 'rgba(255,255,255,0.06)',
          color: isUser ? '#fff' : isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)',
          border: isUser ? 'none' : `0.5px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: isUser ? '0 2px 12px rgba(232,67,106,0.28)' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {renderMarkdown(message.content)}
        {message.isStreaming && (
          <span
            style={{ display: 'inline-block', marginLeft: 1 }}
            className="navia-cursor"
          >
            |
          </span>
        )}
      </div>
    </div>
  );
};

export default NaviaMessageComponent;
