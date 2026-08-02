import React from 'react';
import type { NaviaMessage as NaviaMessageType } from './useNavia';
import NaviaOrb from './NaviaOrb';
import { renderMarkdown } from './markdown';

interface NaviaMessageProps {
  message: NaviaMessageType;
  isLight: boolean;
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
            ? '#FF385C'
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