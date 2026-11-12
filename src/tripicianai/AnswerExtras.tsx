import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconCircleCheckFilled, IconExternalLink, IconMap, IconNews, IconSparkles } from '@tabler/icons-react';

import { safeExternalUrl } from '../utils/sanitizeHtml';
import TripicianAIOrb from './TripicianAIOrb';
import type { TripicianAINewsSource } from './tripicianAIService';
import type { TripicianAIOffer } from './useTripicianAI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-08" → "8 Nov". */
function shortDate(iso?: string): string | null {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month}` : null;
}

/** The news it read for this answer, each opening its article in a new tab. */
export const AnswerSources: React.FC<{ sources: TripicianAINewsSource[] }> = ({ sources }) => (
  <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>News it checked</Typography>
    {sources.map((item, i) => {
      const meta = [item.source, shortDate(item.date)].filter(Boolean).join(' · ');
      const href = item.url ? safeExternalUrl(item.url) : null;
      const body = (
        <>
          <Box component="span" sx={{ color: 'text.secondary', display: 'inline-flex', mt: '2px' }}>
            <IconNews size={15} />
          </Box>
          <Box component="span" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ fontSize: '0.8rem', color: 'text.primary' }}>{item.headline}</Box>
            {meta && <Box component="span" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{meta}</Box>}
          </Box>
          {href && (
            <Box component="span" sx={{ color: 'text.secondary', display: 'inline-flex' }}>
              <IconExternalLink size={13} />
            </Box>
          )}
        </>
      );
      const rowSx = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: '10px',
        bgcolor: 'action.hover',
        textDecoration: 'none',
      } as const;
      return href ? (
        <Box
          key={`${item.headline}:${i}`}
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ ...rowSx, '&:hover': { bgcolor: 'action.selected' } }}
        >
          {body}
        </Box>
      ) : (
        <Box key={`${item.headline}:${i}`} sx={rowSx}>
          {body}
        </Box>
      );
    })}
  </Box>
);

/**
 * Under an answer that lays out a trip: would they like it as a real plan?
 * "Make it a plan" builds the trip (its stops, places and food) and opens it.
 */
export const PlanOfferCard: React.FC<{
  offer: TripicianAIOffer;
  onAccept: () => void;
  onDismiss: () => void;
}> = ({ offer, onAccept, onDismiss }) => {
  if (offer.state === 'dismissed') return null;

  if (offer.state === 'done') {
    return (
      <Box sx={{ mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: '0.85rem', fontWeight: 600 }}>
        <Box component="span" sx={{ color: 'success.main', display: 'inline-flex' }}>
          <IconCircleCheckFilled size={16} />
        </Box>
        Saved as a travel plan
      </Box>
    );
  }

  const creating = offer.state === 'creating';
  return (
    <Box
      sx={(t) => ({
        mt: 1.5,
        p: 1.75,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'primary.main',
        bgcolor: alpha(t.palette.primary.main, 0.06),
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        animation: 'tripicianAIOfferIn 320ms ease-out',
        '@keyframes tripicianAIOfferIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      })}
    >
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconMap size={16} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Make this a travel plan?</Typography>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.25 }}>
            {offer.title
              ? `I'll set up “${offer.title}” with these stops, places and food, ready for your dates and friends.`
              : "I'll set it up with these stops, places and food, ready for your dates and friends."}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          onClick={onAccept}
          disabled={creating}
          variant="contained"
          size="small"
          startIcon={creating ? <TripicianAIOrb size={15} /> : <IconSparkles size={15} />}
          sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, px: 2 }}
        >
          {creating ? 'Building your plan…' : 'Make it a plan'}
        </Button>
        <Button
          onClick={onDismiss}
          disabled={creating}
          size="small"
          sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 600 }}
        >
          Not now
        </Button>
      </Box>
    </Box>
  );
};
