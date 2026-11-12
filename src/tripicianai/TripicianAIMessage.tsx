import React from 'react';
import { IconFlag } from '@tabler/icons-react';
import { BRAND } from '../theme';
import type { TripicianAIMessage as TripicianAIMessageType } from './useTripicianAI';
import TripicianAIWordmark from './TripicianAIWordmark';
import { renderMarkdown } from './markdown';
import DecoratedAnswer from './DecoratedAnswer';
import TripicianAIThinking from './TripicianAIThinking';
import { AnswerSources, PlanOfferCard } from './AnswerExtras';
import { isReportableAnswer } from './reportAnswer';

interface TripicianAIMessageProps {
  message: TripicianAIMessageType;
  isLight: boolean;
  /** Shows "Report" under a finished answer (see useReportAnswer). */
  onReport?: () => void;
  /** The plan offer's buttons, under an answer that lays out a trip. */
  onAcceptOffer?: () => void;
  onDismissOffer?: () => void;
}

/**
 * One turn. The traveler's message is a brand bubble on the right. An answer
 * opens with what it did ("Thought for 4s"), then the decorated answer (day
 * timeline, callouts, chips), the news it read, and an offer to make it a plan.
 */
const TripicianAIMessageComponent: React.FC<TripicianAIMessageProps> = ({
  message,
  isLight,
  onReport,
  onAcceptOffer,
  onDismissOffer,
}) => {
  const isUser = message.role === 'user';
  const mutedColour = isLight ? '#6b7280' : 'rgba(255,255,255,0.55)';
  // A staged answer (the general chat) carries its steps, even an empty list.
  const staged = !isUser && Array.isArray(message.steps);
  const thinking = staged && !!message.isStreaming && !message.content;
  const finished = !isUser && !message.isStreaming && !!message.content.trim();

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
          height={22}
          style={{ marginBottom: 6, marginLeft: 2 }}
        />
      )}

      {staged && (thinking || (message.steps?.length ?? 0) > 0) && (
        <div style={{ alignSelf: 'stretch', marginLeft: 2 }}>
          <TripicianAIThinking steps={message.steps ?? []} active={thinking} thinkingMs={message.thinkingMs} />
        </div>
      )}

      {(!staged || message.content) && (
        <div
          style={{
            padding: '10px 14px',
            maxWidth: isUser ? '75%' : staged ? '100%' : '85%',
            alignSelf: isUser || !staged ? undefined : 'stretch',
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
          {isUser ? (
            renderMarkdown(message.content)
          ) : (
            <DecoratedAnswer content={message.content} streaming={message.isStreaming} />
          )}
        </div>
      )}

      {finished && message.sources && message.sources.length > 0 && (
        <div style={{ alignSelf: 'stretch' }}>
          <AnswerSources sources={message.sources} />
        </div>
      )}

      {finished && message.offer && onAcceptOffer && onDismissOffer && (
        <div style={{ alignSelf: 'stretch' }}>
          <PlanOfferCard offer={message.offer} onAccept={onAcceptOffer} onDismiss={onDismissOffer} />
        </div>
      )}

      {onReport && isReportableAnswer(message) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            fontSize: 11,
            fontWeight: 500,
            color: mutedColour,
          }}
        >
          <button
            type="button"
            onClick={onReport}
            aria-label="Report this answer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <IconFlag size={12} stroke={1.8} />
            Report
          </button>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>|</span>
          <span>Note: AI can make mistakes.</span>
        </div>
      )}
    </div>
  );
};

export default TripicianAIMessageComponent;
