import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconCheck, IconChevronDown, IconChevronUp, IconCircleCheckFilled, IconSparkles } from '@tabler/icons-react';

import TripicianAIOrb from './TripicianAIOrb';
import type { TripicianAIStage } from './tripicianAIService';

/** "Vibing with your travel pattern…" → "Vibing with your travel pattern", for a finished step. */
const done = (label: string) => label.replace(/\s*(…|\.\.\.)\s*$/, '');

function thoughtLabel(ms: number | undefined): string {
  if (ms === undefined) return 'Thought it through';
  return `Thought for ${Math.max(1, Math.round(ms / 1000))}s`;
}

/**
 * What Tripician Intelligence is doing before its first words, and afterwards
 * what it did. While it works, finished steps are ticked off and the current
 * one breathes beside the spinning orb. Once the answer is in, it folds into
 * "Thought for 4s", which opens to show the steps again.
 */
const TripicianAIThinking: React.FC<{ steps: TripicianAIStage[]; active: boolean; thinkingMs?: number }> = ({
  steps,
  active,
  thinkingMs,
}) => {
  const [open, setOpen] = React.useState(false);

  if (active) {
    const current = steps[steps.length - 1];
    return (
      <Box role="status" aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, py: 0.5 }}>
        {steps.slice(0, -1).map((step) => (
          <Box
            key={step.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pl: '3px',
              color: 'text.secondary',
              fontSize: '0.78rem',
              animation: 'tripicianAIStepIn 220ms ease-out',
              '@keyframes tripicianAIStepIn': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
          >
            <Box component="span" sx={{ color: 'success.main', display: 'inline-flex' }}>
              <IconCircleCheckFilled size={15} />
            </Box>
            {done(step.label)}
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
          <Box
            sx={{
              display: 'inline-flex',
              animation: 'tripicianAISpin 3.2s linear infinite',
              '@keyframes tripicianAISpin': { to: { transform: 'rotate(360deg)' } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            <TripicianAIOrb size={20} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              key={current?.id ?? 'start'}
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                animation: 'tripicianAIBreathe 1.8s ease-in-out infinite',
                '@keyframes tripicianAIBreathe': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.45 } },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            >
              {current?.label ?? 'Thinking…'}
            </Typography>
            {current?.detail && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
                {current.detail}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  if (!steps.length) return null;

  return (
    <Box sx={{ mb: 0.75 }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          p: '2px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: '0.75rem',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <Box component="span" sx={{ color: 'primary.main', display: 'inline-flex' }}>
          <IconSparkles size={13} />
        </Box>
        {thoughtLabel(thinkingMs)}
        {open ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
      </Box>
      {open && (
        <Box
          sx={{
            mt: 0.75,
            ml: 0.75,
            pl: 1.25,
            borderLeft: '2px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {steps.map((step) => (
            <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
              <Box component="span" sx={{ color: 'success.main', display: 'inline-flex' }}>
                <IconCheck size={13} />
              </Box>
              <span>
                {done(step.label)}
                {step.detail && <Box component="span" sx={{ color: 'text.disabled' }}>{`  ·  ${step.detail}`}</Box>}
              </span>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TripicianAIThinking;
