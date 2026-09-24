import React from 'react';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { IconCopy, IconMapPin, IconUsersPlus } from '@tabler/icons-react';
import { useRequireAuth } from '../auth/AuthGate';
import { useAuthToken } from '../hooks/useAuth0Token';
import { apiServices } from '../services/APIs/apiServices';
import { useTripCover } from '../utils/tripCover';
import { describeSpots } from '../seats/types';
import ImageBadge from '../components/ui/ImageBadge';
import { highlightsLine, planSummaryLine, stopNights, visibleStops } from './postcardPreview';
import type { PlanPreview, PlanStop, PostAttachment } from './types';

interface PlanPostcardProps {
  attachment: PostAttachment;
  plan: PlanPreview;
  /** The author's own plan: nothing to copy or join, so the footer just opens it. */
  isOwn?: boolean;
}

const DOT = 20;

// Numbered stops on one hairline, nights under each: the shape of the trip at a glance.
const RouteSpine: React.FC<{ stops: PlanStop[]; more: number }> = ({ stops, more }) => {
  const theme = useTheme();
  const cols = stops.length + (more > 0 ? 1 : 0);
  return (
    <Box
      component="ol"
      aria-label="Route"
      sx={{ position: 'relative', listStyle: 'none', m: 0, mt: 1.5, p: 0, display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {/* From the first dot's centre to the last one's, so the line never pokes out past either end. */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', top: DOT / 2, left: `calc(100% / ${cols * 2})`, right: `calc(100% / ${cols * 2})`, height: '1px', bgcolor: theme.custom.surface.border }}
      />
      {stops.map((stop, i) => {
        const nights = stopNights(stop);
        return (
          <Box component="li" key={`${stop.name}-${i}`} sx={{ position: 'relative', textAlign: 'center', px: 0.5, minWidth: 0 }}>
            <Box
              sx={{
                mx: 'auto',
                width: DOT,
                height: DOT,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 10.5,
                fontWeight: 700,
                bgcolor: 'text.primary',
                color: 'background.paper',
                boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
              }}
            >
              {i + 1}
            </Box>
            <Typography variant="caption" noWrap title={stop.name} sx={{ display: 'block', mt: 0.75, fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
              {stop.name}
            </Typography>
            {nights && (
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', fontSize: 11, lineHeight: 1.3 }}>
                {nights}
              </Typography>
            )}
          </Box>
        );
      })}
      {more > 0 && (
        <Box component="li" sx={{ position: 'relative', textAlign: 'center', px: 0.5, minWidth: 0 }}>
          <Box
            sx={{
              mx: 'auto',
              width: DOT,
              height: DOT,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'text.secondary',
              bgcolor: 'background.paper',
              border: `1px dashed ${theme.palette.text.disabled}`,
            }}
          >
            {`+${more}`}
          </Box>
          {/* Reads "+2 more" with the dot, and fits a phone column where "2 more stops" did not. */}
          <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.75, color: 'text.secondary', lineHeight: 1.3 }}>
            {more === 1 ? 'more stop' : 'more stops'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// A plan on the wall: where it goes, for how long and what is worth seeing, with the one action it invites.
const PlanPostcard: React.FC<PlanPostcardProps> = ({ attachment, plan, isOwn = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const [coverFailed, setCoverFailed] = React.useState(false);
  const [copying, setCopying] = React.useState(false);

  // The same photo the trip card shows: saved banner, then the curated country cover.
  const coverSource = React.useMemo(
    () => ({ bannerPhotoUrl: attachment.coverUrl, countries: plan.countries, name: attachment.title }),
    [attachment.coverUrl, attachment.title, plan.countries],
  );
  const resolvedCover = useTripCover(coverSource);
  const cover = coverFailed ? null : resolvedCover;

  const { shown, more } = visibleStops(plan.stops, plan.stopCount, narrow ? 3 : 4);
  const summary = [planSummaryLine(plan), attachment.meta].filter(Boolean).join(' · ');
  const highlights = highlightsLine(plan.highlights, plan.placeCount);
  const spots = describeSpots({ spotsLeft: plan.spotsLeft });
  const copies = plan.cloneCount ?? 0;

  const copyPlan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth({ reason: 'Copying a plan gives you your own version to change however you like.' }) || !token) return;
    if (copying) return;
    setCopying(true);
    try {
      const resp = await apiServices.cloneTrip(token, attachment.id);
      const newId = (resp.data as { tripId?: string; id?: string } | undefined)?.tripId ?? (resp.data as { id?: string } | undefined)?.id;
      if (newId) navigate(`/tripplanner/${newId}`, { state: { tripId: newId, __ts: Date.now() } });
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That plan could not be copied. Try again.' } }));
    } finally {
      setCopying(false);
    }
  };

  const footerNote = plan.joinable
    ? (spots ?? 'Open to join requests')
    : copies > 0
      ? `Copied by ${copies} ${copies === 1 ? 'traveller' : 'travellers'}`
      : isOwn ? null : 'Copy it, then change anything';

  return (
    <Box
      // Stops the click here: the post card around it is a link to the post, not the plan.
      onClick={(e) => e.stopPropagation()}
      sx={{
        mb: 1,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        cursor: 'default',
        transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { borderColor: 'text.disabled' },
      }}
    >
      <Box
        component={RouterLink}
        to={attachment.href}
        aria-label={`Open plan: ${attachment.title}`}
        sx={{
          display: 'block',
          color: 'inherit',
          textDecoration: 'none',
          '&:hover .plan-postcard-img': { transform: 'scale(1.03)' },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
        }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden', aspectRatio: '12 / 5', bgcolor: theme.custom.surface.active }}>
          {cover && (
            <Box
              component="img"
              className="plan-postcard-img"
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setCoverFailed(true)}
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
          {plan.joinable && (
            <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
              <ImageBadge sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <IconUsersPlus size={12} stroke={2} />
                Looking for people
              </ImageBadge>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 1.75, pt: 1.25, pb: 1.5 }}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {attachment.title}
          </Typography>
          {summary && (
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
              {summary}
            </Typography>
          )}

          {/* One stop is named, never diagrammed: a single dot on an empty line reads as a failed render. */}
          {shown.length >= 2 ? (
            <RouteSpine stops={shown} more={more} />
          ) : shown.length === 1 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25, color: 'text.primary' }}>
              <IconMapPin size={15} stroke={1.9} />
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {[shown[0].name, shown[0].nights !== plan.nights ? stopNights(shown[0]) : null].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          ) : null}

          {highlights && (
            <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>Worth seeing: </Box>
              {highlights}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.75,
          py: 1,
          borderTop: `1px solid ${theme.custom.surface.border}`,
        }}
      >
        <Typography
          variant="caption"
          noWrap
          sx={{
            flex: 1,
            minWidth: 0,
            // Coloured type takes the on-surface brand shade; the logo coral itself is below AA as text.
            color: plan.joinable ? (theme.palette.mode === 'dark' ? theme.custom.brand.onDark : theme.custom.brand.onLight) : 'text.secondary',
            fontWeight: plan.joinable ? 700 : 500,
          }}
        >
          {footerNote}
        </Typography>
        {isOwn ? (
          <Button component={RouterLink} to={attachment.href} size="small" variant="outlined" sx={{ flexShrink: 0 }}>
            Open plan
          </Button>
        ) : plan.joinable ? (
          <Button component={RouterLink} to={attachment.href} size="small" variant="contained" startIcon={<IconUsersPlus size={15} />} sx={{ flexShrink: 0 }}>
            Ask to join
          </Button>
        ) : (
          <Button onClick={copyPlan} disabled={copying} size="small" variant="outlined" startIcon={<IconCopy size={15} />} sx={{ flexShrink: 0 }}>
            {copying ? 'Copying' : 'Use this plan'}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PlanPostcard;
