import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import VerifiedTripBadge from '../../components/CommonComponents/VerifiedTripBadge';
import { useTripCover } from '../../utils/tripCover';

interface FeatureTripCardProps {
  trip: any;
  onClick: () => void;
  /**
   * The kicker above the title. A prop rather than a constant because the card
   * outlived the module it was built for: it used to be hardcoded "Trip of the
   * day", and when that slot became Tripician Verified the card kept announcing
   * the old thing under the new data.
   */
  eyebrow?: string;
}

/**
 * The editorial split card: the one module on the community scroll with copy on
 * one side and a photograph on the other.
 *
 * The one module on the community scroll with copy on one side and a photo on
 * the other. That asymmetry is deliberate: it sits between a full-bleed hero and
 * a uniform grid, and without it the page reads as one long list of cards.
 */
const FeatureTripCard: React.FC<FeatureTripCardProps> = ({ trip, onClick, eyebrow = 'Featured trip' }) => {
  const theme = useTheme();
  const photo = useTripCover(trip);

  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const nights =
    typeof trip.totalNights === 'number'
      ? trip.totalNights
      : typeof trip.targetNights === 'number'
        ? trip.targetNights
        : null;

  const metaLine = [
    countries.slice(0, 3).join(' · ') || null,
    nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
    trip.owner?.name ? `by ${trip.owner.name}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Box
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
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
        '&:hover .feature-cover img': { transform: 'scale(1.03)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      {/* Editorial copy */}
      <Box
        sx={{
          order: { xs: 2, md: 1 },
          p: { xs: 3, md: 5 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          {eyebrow}
        </Typography>

        {/* The badge needs its own flex row rather than sitting inline: the title
            is a clamped `-webkit-box`, so anything inside it becomes part of the
            clamped text and can be truncated away. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {trip.name || 'Untitled Trip'}
          </Typography>
          <VerifiedTripBadge
            verified={trip.verified ?? trip.Verified}
            verifiedAt={trip.verifiedAt ?? trip.VerifiedAt}
            variant="hero"
          />
        </Box>

        {trip.description && (
          <Typography
            sx={{
              fontSize: 14.5,
              lineHeight: 1.6,
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {trip.description}
          </Typography>
        )}

        {metaLine && (
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>
            {metaLine}
          </Typography>
        )}

        <Box sx={{ mt: 1 }}>
          <Button variant="contained" endIcon={<IconArrowRight size={16} />}>
            View itinerary
          </Button>
        </Box>
      </Box>

      {/* Photo */}
      <Box
        className="feature-cover"
        sx={{
          order: { xs: 1, md: 2 },
          position: 'relative',
          overflow: 'hidden',
          minHeight: { xs: 210, sm: 260, md: 360 },
          bgcolor: theme.custom.surface.active,
        }}
      >
        {photo && (
          <Box
            component="img"
            src={photo}
            alt={trip.name || 'Featured trip'}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default FeatureTripCard;
