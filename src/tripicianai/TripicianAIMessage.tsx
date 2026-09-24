import React from 'react';
import { BRAND } from '../theme';
import type { TripicianAIMessage as TripicianAIMessageType } from './useTripicianAI';
import TripicianAIOrb from './TripicianAIOrb';
import { renderMarkdown } from './markdown';

interface TripicianAIMessageProps {
  message: TripicianAIMessageType;
  isLight: boolean;
}

const TripicianAIMessageComponent: React.FC<TripicianAIMessageProps> = ({
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
          <TripicianAIOrb size={22} />

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isLight
                ? '#4b5563'
                : 'rgba(255,255,255,0.75)',
            }}
          >
            TripicianAI
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

          background: isUser
            ? BRAND.coral
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
            className="tripicianai-cursor"
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

export default TripicianAIMessageComponent;