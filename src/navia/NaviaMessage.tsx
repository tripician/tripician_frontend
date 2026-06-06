import React from 'react';
import type { NaviaMessage as NaviaMessageType } from './useNavia';

interface NaviaMessageProps {
  message: NaviaMessageType;
  isLight: boolean;
}

/** Lightweight markdown renderer */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    const isBullet = /^[-*]\s+/.test(line);
    const content = isBullet ? line.replace(/^[-*]\s+/, '') : line;

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
        <span
          key={li}
          style={{
            display: 'block',
            paddingLeft: 14,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 2,
            }}
          >
            •
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

const NAVIA_LOGO =  import.meta.env.VITE_NAVIA_LOGO as string | undefined;

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
          <img
            src={NAVIA_LOGO}
            alt="Navia"
            style={{
              width: 30,
              height: 30,
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />

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