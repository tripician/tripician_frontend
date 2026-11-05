import React from 'react';
import { IconFlag } from '@tabler/icons-react';
import { BRAND } from '../theme';
import type { TripicianAIMessage as TripicianAIMessageType } from './useTripicianAI';
import TripicianAIWordmark from './TripicianAIWordmark';
import { renderMarkdown } from './markdown';
import { isReportableAnswer } from './reportAnswer';

interface TripicianAIMessageProps {
  message: TripicianAIMessageType;
  isLight: boolean;
  /** Shows "Report" under a finished answer (see useReportAnswer). */
  onReport?: () => void;
}

const TripicianAIMessageComponent: React.FC<TripicianAIMessageProps> = ({
  message,
  isLight,
  onReport,
}) => {
  const isUser = message.role === 'user';
  const mutedColour = isLight ? '#6b7280' : 'rgba(255,255,255,0.55)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {!isUser && (
        // The lockup in place of the orb and written name, at label size.
        <TripicianAIWordmark
          height={28}
          onDark={!isLight}
          style={{ marginBottom: 6, marginLeft: 2 }}
        />
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

      {onReport && isReportableAnswer(message) && (
        <button
          type="button"
          onClick={onReport}
          aria-label="Report this answer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
            padding: '3px 4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: mutedColour,
          }}
        >
          <IconFlag size={12} stroke={1.8} />
          Report
        </button>
      )}
    </div>
  );
};

export default TripicianAIMessageComponent;