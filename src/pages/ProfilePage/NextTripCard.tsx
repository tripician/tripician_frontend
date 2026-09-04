/**
 * The soonest trip that has not started yet.
 *
 * Sits above the tabs because it is the one thing a returning traveller almost
 * always wants, and finding it in a grid of every trip you have ever planned is
 * work the page can do for them.
 *
 * Same editorial split shape as Trip of the day on Community, which is
 * deliberate: both are "one thing pulled out of a list", and giving them the
 * same silhouette makes that legible without a label explaining it.
 */

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { TripVM } from './tripViewModel';

interface NextTripCardProps {
  trip: TripVM;
  onOpen: () => void;
}

const NextTripCard: React.FC<NextTripCardProps> = ({ trip, onOpen }) => {
  const theme = useTheme();

  const departs = trip.startDate
    ? new Date(trip.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  return (
    <Box
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        mt: 4,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          order: { xs: 2, md: 1 },
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 1.25,
          minWidth: 0,
        }}
      >
        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          Next trip
        </Typography>

        <Typography
          variant="h2"
          component="h2"
          sx={{
            color: 'text.primary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {trip.title}
        </Typography>

        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          {[trip.location, departs ? `departs ${departs}` : null].filter(Boolean).join('  ·  ')}
        </Typography>

        <Box sx={{ mt: 1 }}>
          <Button variant="contained" size="small">
            Open trip
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          order: { xs: 1, md: 2 },
          position: 'relative',
          minHeight: { xs: 180, md: 260 },
          bgcolor: theme.custom.surface.active,
        }}
      >
        {trip.image && (
          <Box
            component="img"
            src={trip.image}
            alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
    </Box>
  );
};

export default NextTripCard;
