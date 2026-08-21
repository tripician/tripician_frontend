/**
 * The Community hero: real work from the community, and a pitch for each thing
 * you can do here, in one carousel.
 *
 * This was a stories-only hero. Mixing promos in is the point: the features that
 * took longest to build were the ones nobody could find, and somebody who has
 * never written an after story has no reason to guess that it exists. So a real
 * story, then how to plan one, then a real trip, then how to write yours, then
 * the printed book.
 *
 * Built on CSS scroll-snap rather than a carousel library: the browser already
 * does momentum, touch and snapping better than a JS implementation would, and
 * the repo has no carousel dependency worth adding one for.
 *
 * Deliberately not auto-advancing. A hero that moves under the reader is a
 * reliable way to make somebody miss the thing they were about to click.
 */

import React from 'react';
import { Avatar, Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconChevronRight, IconMapPin } from '@tabler/icons-react';
import { storyPath } from '../../afterstory/storySlug';
import { resolveStoryCover, formatTravelWindow } from '../../afterstory/storyFormat';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { tripPath } from '../../utils/tripSlug';
import { tripCoverPhoto } from '../../utils/tripCover';
import { VIBES } from './vibes';
import type { HeroPromo } from './heroSlides';

export type HeroSlide =
  | { kind: 'story'; id: string; story: AfterStorySummaryDto }
  | { kind: 'trip'; id: string; trip: any }
  | { kind: 'promo'; id: string; promo: HeroPromo };

interface CommunityHeroProps {
  slides: HeroSlide[];
  /** Where a promo's button goes. Kept out here so the hero owns no routing rules. */
  onPromo: (id: string) => void;
}

const CommunityHero: React.FC<CommunityHeroProps> = ({ slides, onPromo }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState(0);

  // Derived from scroll position rather than tracked as state the buttons set,
  // so dragging, keyboard scrolling and the arrows all agree on which slide is
  // current without three code paths trying to stay in sync.
  const onScroll = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(slides.length - 1, index)));
  }, [slides.length]);

  const scrollTo = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  if (slides.length === 0) return null;

  return (
    <Box sx={{ position: 'relative', mb: { xs: 3, md: 4 } }}>
      <Box
        ref={trackRef}
        onScroll={onScroll}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          borderRadius: '20px',
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {slides.map((slide) => {
          if (slide.kind === 'story') {
            const st = slide.story;
            return (
              <StorySlide key={slide.id} story={st} onOpen={() => navigate(storyPath(st))} />
            );
          }
          if (slide.kind === 'trip') {
            return (
              <TripSlide
                key={slide.id}
                trip={slide.trip}
                onOpen={() => {
                  const id = slide.trip.id || slide.trip.Id;
                  if (id) navigate(tripPath({ id, name: slide.trip.name }), { state: { trip: slide.trip } });
                }}
              />
            );
          }
          return (
            <PromoSlide key={slide.id} promo={slide.promo} onAct={() => onPromo(slide.promo.id)} />
          );
        })}
      </Box>

      {slides.length > 1 && (
        <>
          <Arrow side="left" disabled={active === 0} onClick={() => scrollTo(active - 1)} />
          <Arrow side="right" disabled={active === slides.length - 1} onClick={() => scrollTo(active + 1)} />

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
            {slides.map((slide, index) => (
              <Box
                key={slide.id}
                component="button"
                type="button"
                aria-label={`Go to slide ${index + 1} of ${slides.length}`}
                aria-current={index === active}
                onClick={() => scrollTo(index)}
                sx={{
                  width: index === active ? 20 : 7,
                  height: 7,
                  p: 0,
                  border: 0,
                  borderRadius: 999,
                  cursor: 'pointer',
                  bgcolor: index === active ? 'primary.main' : theme.custom.surface.active,
                  transition: `width ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

/* ── shared slide chrome ─────────────────────────────────────────────────── */

const SLIDE_SX = {
  position: 'relative',
  flex: '0 0 100%',
  scrollSnapAlign: 'start',
  height: { xs: 340, md: 420 },
  display: 'flex',
  alignItems: 'flex-end',
  bgcolor: '#0F0F13',
  overflow: 'hidden',
} as const;

const SCRIM =
  'linear-gradient(180deg, rgba(15,15,19,0.20) 0%, rgba(15,15,19,0.05) 30%, rgba(15,15,19,0.82) 100%)';

const SlideShell: React.FC<{ image?: string | null; onImageError?: () => void; children: React.ReactNode }> = ({
  image,
  onImageError,
  children,
}) => (
  <Box sx={SLIDE_SX}>
    {image && (
      <Box
        component="img"
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        onError={onImageError}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )}
    <Box sx={{ position: 'absolute', inset: 0, background: SCRIM }} />
    {/* Extra left padding from md up so the copy clears the previous-slide
        arrow, which is vertically centred and was landing on top of the
        eyebrow. Below md there is no arrow: swiping is the gesture there. */}
    <Box sx={{ position: 'relative', p: { xs: 2.5, md: 4 }, pl: { md: 8 }, maxWidth: 720 }}>
      {children}
    </Box>
  </Box>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)' }}>
    {children}
  </Typography>
);

/**
 * The slide headline.
 *
 * Takes its face and size from the `h2` variant rather than reaching for the
 * display-serif token and a hand-picked fontSize. Two rules meet here: that
 * token is reserved for editorial surfaces and must not spread (a guard test
 * enforces it, and this component moved out of `afterstory/` where it used to be
 * allowed), and the type scale is the only place sizes get chosen.
 *
 * Rendered as a `p`, not a heading: one slide is visible at a time but all of
 * them are in the document, and five competing h2s would clutter the outline
 * for the sake of a carousel.
 */
const Headline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="h2"
    component="p"
    sx={{
      color: '#fff',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }}
  >
    {children}
  </Typography>
);

/* ── the three slide kinds ───────────────────────────────────────────────── */

const StorySlide: React.FC<{ story: AfterStorySummaryDto; onOpen: () => void }> = ({ story, onOpen }) => {
  const [failed, setFailed] = React.useState(false);
  const cover = resolveStoryCover(story, failed);
  const vibe = story.vibe ? VIBES[story.vibe] : null;

  return (
    <SlideShell image={cover} onImageError={() => setFailed(true)}>
      <Eyebrow>{vibe ? vibe.label : 'From the community'}</Eyebrow>
      <Headline>{story.title}</Headline>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mt: 1.5, color: 'rgba(255,255,255,0.9)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Avatar
            src={story.author?.profilePicture ?? undefined}
            sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.main' }}
          >
            {story.author?.displayName?.[0] ?? 'T'}
          </Avatar>
          <Typography variant="body2">{story.author?.displayName ?? 'A traveller'}</Typography>
        </Box>

        {story.destination && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
            <IconMapPin size={14} />
            <Typography variant="body2">{story.destination}</Typography>
          </Box>
        )}

        {formatTravelWindow(story.travelStartDate) && (
          <Typography variant="body2">{formatTravelWindow(story.travelStartDate)}</Typography>
        )}
      </Box>

      <Button variant="contained" onClick={onOpen} sx={{ mt: 2.5 }}>
        Read the story
      </Button>
    </SlideShell>
  );
};

const TripSlide: React.FC<{ trip: any; onOpen: () => void }> = ({ trip, onOpen }) => {
  const [failed, setFailed] = React.useState(false);
  const cover = failed ? null : tripCoverPhoto(trip);
  const nights = trip.totalNights ?? trip.targetNights ?? null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const verified = (trip.verified ?? trip.Verified) === true;

  return (
    <SlideShell image={cover} onImageError={() => setFailed(true)}>
      <Eyebrow>{verified ? 'Tripician Verified' : 'A trip somebody took'}</Eyebrow>
      <Headline>{trip.name || 'Untitled trip'}</Headline>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mt: 1.5, color: 'rgba(255,255,255,0.9)' }}>
        {countries.length > 0 && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
            <IconMapPin size={14} />
            <Typography variant="body2">{countries.slice(0, 2).join(' · ')}</Typography>
          </Box>
        )}
        {nights !== null && (
          <Typography variant="body2">{nights} {nights === 1 ? 'night' : 'nights'}</Typography>
        )}
        {trip.owner?.name && <Typography variant="body2">by {trip.owner.name}</Typography>}
      </Box>

      <Button variant="contained" onClick={onOpen} sx={{ mt: 2.5 }}>
        Copy this plan
      </Button>
    </SlideShell>
  );
};

const PromoSlide: React.FC<{ promo: HeroPromo; onAct: () => void }> = ({ promo, onAct }) => (
  <SlideShell image={promo.image}>
    <Eyebrow>{promo.eyebrow}</Eyebrow>
    <Headline>{promo.title}</Headline>
    <Typography
      variant="body2"
      sx={{
        color: 'rgba(255,255,255,0.88)',
        mt: 1.5,
        maxWidth: '58ch',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {promo.body}
    </Typography>
    <Button variant="contained" onClick={onAct} sx={{ mt: 2.5 }}>
      {promo.cta}
    </Button>
  </SlideShell>
);

const Arrow: React.FC<{ side: 'left' | 'right'; disabled: boolean; onClick: () => void }> = ({
  side,
  disabled,
  onClick,
}) => (
  <IconButton
    onClick={onClick}
    disabled={disabled}
    aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
    sx={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      [side]: 12,
      // Hidden on touch: swiping is the gesture there, and arrows would sit on
      // top of the content for no gain.
      display: { xs: 'none', md: 'inline-flex' },
      color: '#fff',
      bgcolor: 'rgba(15,15,19,0.45)',
      '&:hover': { bgcolor: 'rgba(15,15,19,0.68)' },
      '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' },
    }}
  >
    {side === 'left' ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
  </IconButton>
);

export default CommunityHero;
