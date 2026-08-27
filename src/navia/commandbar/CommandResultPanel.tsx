import React from 'react';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { IconX, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { renderMarkdown } from '../markdown';
import NaviaOrb from '../NaviaOrb';
import ScrollRail from '../../components/ui/ScrollRail';
import StoryCard from '../../afterstory/cards/StoryCard';

import type { AfterStorySummaryDto } from '../../afterstory/types';

export interface AskTurn {
  question: string;
  answer: string;
  streaming: boolean;
}

interface Props {
  turns: AskTurn[];
  stories: AfterStorySummaryDto[];
  citationsLoading: boolean;
  onClose: () => void;
}

/** Real Tripician work sits under the model's answer, never mixed into it. */
const CommandResultPanel: React.FC<Props> = ({ turns, stories, citationsLoading, onClose }) => {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  return (
    <Box
      role="region"
      aria-label="Navia answer"
      aria-live="polite"
      sx={(t) => ({
        maxHeight: 'min(60vh, 560px)',
        overflowY: 'auto',
        borderBottom: `1px solid ${t.custom.surface.border}`,
        px: { xs: 2, sm: 2.5 },
        py: 2,
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <NaviaOrb size={14} processing={turns.some((t) => t.streaming)} />
          <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1 }}>
            Navia
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close the answer">
          <IconX size={16} />
        </IconButton>
      </Box>

      {turns.map((turn, i) => (
        <Box key={i} sx={{ mt: i === 0 ? 1.5 : 2.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>
            {turn.question}
          </Typography>
          <Box sx={{ mt: 1, fontSize: '0.9375rem', lineHeight: 1.6, color: 'text.primary' }}>
            {renderMarkdown(turn.answer)}
            {turn.streaming && <span className="navia-cursor">&#9611;</span>}
          </Box>
        </Box>
      ))}

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
