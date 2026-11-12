import React from 'react';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { IconX, IconArrowRight, IconFlag } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import DecoratedAnswer from '../DecoratedAnswer';
import TripicianAIThinking from '../TripicianAIThinking';
import { AnswerSources, PlanOfferCard } from '../AnswerExtras';
import TripicianAIWordmark from '../TripicianAIWordmark';
import { useCreateTripFromChat } from '../useCreateTripFromChat';
import { useReportAnswer } from '../useReportAnswer';
import ScrollRail from '../../components/ui/ScrollRail';
import StoryCard from '../../afterstory/cards/StoryCard';

import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { TripicianAINewsSource, TripicianAIStage } from '../tripicianAIService';
import type { TripicianAIOffer } from '../useTripicianAI';

export interface AskTurn {
  question: string;
  answer: string;
  streaming: boolean;
  /** The steps it took before answering (staged answers). */
  steps?: TripicianAIStage[];
  thinkingMs?: number;
  sources?: TripicianAINewsSource[];
  offer?: TripicianAIOffer;
}

interface Props {
  turns: AskTurn[];
  stories: AfterStorySummaryDto[];
  citationsLoading: boolean;
  onClose: () => void;
  token?: string | null;
  /** Moves a turn's plan offer along (creating, done, dismissed). */
  onUpdateOffer?: (index: number, patch: Partial<TripicianAIOffer>) => void;
}

/** Real Tripician work sits under the model's answer, never mixed into it. */
const CommandResultPanel: React.FC<Props> = ({ turns, stories, citationsLoading, onClose, token, onUpdateOffer }) => {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const { openReport, reportDialog } = useReportAnswer('web:command-bar');
  const createTripFromChat = useCreateTripFromChat(token);

  // "Make it a plan": the planner opens (or the create form, when the plan
  // could not be read), so the answer panel closes either way.
  const acceptOffer = async (index: number) => {
    const turn = turns[index];
    if (!turn?.offer || turn.offer.state === 'creating') return;
    onUpdateOffer?.(index, { state: 'creating' });
    const failure = await createTripFromChat(turn.answer, turn.question, turn.offer.title);
    onUpdateOffer?.(index, { state: failure ? 'open' : 'done' });
    onClose();
  };

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  return (
    <Box
      role="region"
      aria-label="Tripician Intelligence answer"
      aria-live="polite"
      sx={(t) => ({
        maxHeight: 'min(60vh, 560px)',
        overflowY: 'auto',
        borderBottom: `1px solid ${t.custom.surface.border}`,
        px: { xs: 2, sm: 2.5 },
        py: 2,
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <TripicianAIWordmark height={26} />
        <IconButton size="small" onClick={onClose} aria-label="Close the answer">
          <IconX size={16} />
        </IconButton>
      </Box>

      {turns.map((turn, i) => (
        <Box key={i} sx={{ mt: i === 0 ? 1.5 : 2.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>
            {turn.question}
          </Typography>
          {turn.steps && (turn.steps.length > 0 || (turn.streaming && !turn.answer)) && (
            <Box sx={{ mt: 1 }}>
              <TripicianAIThinking
                steps={turn.steps}
                active={turn.streaming && !turn.answer}
                thinkingMs={turn.thinkingMs}
              />
            </Box>
          )}
          {(turn.answer || !turn.steps) && (
            <Box sx={{ mt: 1, fontSize: '0.9375rem', lineHeight: 1.6, color: 'text.primary' }}>
              <DecoratedAnswer content={turn.answer} streaming={turn.streaming} />
            </Box>
          )}
          {!turn.streaming && turn.answer.trim() && turn.sources && turn.sources.length > 0 && (
            <AnswerSources sources={turn.sources} />
          )}
          {!turn.streaming && turn.answer.trim() && turn.offer && onUpdateOffer && (
            <PlanOfferCard
              offer={turn.offer}
              onAccept={() => void acceptOffer(i)}
              onDismiss={() => onUpdateOffer(i, { state: 'dismissed' })}
            />
          )}
          {!turn.streaming && turn.answer.trim() && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
              <Box
                component="button"
                type="button"
                onClick={() => openReport(turn.answer, turn.question)}
                aria-label="Report this answer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  p: '2px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <IconFlag size={12} stroke={1.8} />
                Report
              </Box>
              <Box component="span" aria-hidden="true" sx={{ color: 'divider' }}>|</Box>
              <span>Note: AI can make mistakes.</span>
            </Box>
          )}
        </Box>
      ))}
      {reportDialog}

      {(citationsLoading || stories.length > 0) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="overline" sx={{ color: 'text.disabled' }}>
            From Tripician
          </Typography>
          {citationsLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <CircularProgress size={14} thickness={5} />
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                Looking for stories from people who went.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mt: 1 }}><ScrollRail ariaLabel="Stories from Tripician">
                {stories.map((s) => (
                  <StoryCard key={s.id} story={s} width={200} />
                ))}
              </ScrollRail></Box>
              <Box sx={{ mt: 1.25 }}>
                <Typography
                  component={Link}
                  to="/stories"
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'primary.main',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Browse every story <IconArrowRight size={14} />
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}

      <div ref={bottomRef} />
    </Box>
  );
};

export default CommandResultPanel;
