/**
 * The trip card. One shell for every surface that shows a trip: Community,
 * Templates, a traveller's public profile, your own Profile, and the recruitment
 * listings coming in Stage 1.
 *
 * The anatomy is a listing, deliberately. A trip is a commercial object - it has
 * a host, a crew, a date, a price and a number of seats - and it should read like
 * one. That is why `StoryCard` is NOT built on this and never should be: a story
 * is authored, has no price, and dressing it in listing chrome would put the
 * archive up for sale.
 *
 * ## One anatomy, no per-surface exceptions
 *
 * Every row below renders from the same props in the same order wherever the card
 * appears, and a surface opts out only by passing nothing:
 *
 *     cover     country flags + tags (top left)   crew faces (top right)
 *               host avatar         (bottom left)  status     (bottom right)
 *     body      title + Tripician Verified
 *               description
 *               "updated 3mo ago · 7 nights plan" + confirmed + rating
 *               price + spots      (recruiting trips only)
 *               footer             (per-surface actions)
 *
 * The previous split - Community showing a host and dates, Profile showing an
 * edit time and a crew in its footer - meant the same trip was a visibly
 * different object depending on where you found it. Anything genuinely local to a
 * surface goes in `footer`, which is the one slot allowed to differ.
 *
 * Several things are deliberately shown once rather than twice. The host is a
 * portrait on the cover and NOT a "with {name}" line under it; the place is a
 * flag rather than a word, and no longer also an ISO code before the title. Each
 * was saying the same thing in two registers, and the picture is the half that
 * survives a glance across a grid.
 */

import React from 'react';
import { BRAND } from '../../theme';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import { IconMapPin, IconStarFilled, IconCheck, IconUser } from '@tabler/icons-react';
import { formatRelativeTime, formatAbsoluteDateTime } from '../../utils/relativeTime';
import { normaliseCountries } from '../../utils/tripMeta';
import VerifiedTripBadge from '../CommonComponents/VerifiedTripBadge';
import CountryFlag from './CountryFlag';
import IdentityVerifiedMark from './IdentityVerifiedMark';
import CardTypeTag from './CardTypeTag';
import type { CardTypeKind } from './cardTypes';

/** Faces shown before the rest of the crew collapses into "+N". */
const CREW_FACES = 3;
/** Flags shown before the remaining countries collapse into "+N". */
const PLACE_FLAGS = 3;
/** Diameter of a cover token, flag or face. They sit in facing corners and must match. */
const TOKEN = 28;

/**
 * Deterministic avatar colour from a name or id, so the same traveller keeps the
 * same fallback colour on every card rather than changing identity per surface.
 */
const AVATAR_COLORS = [BRAND.coral, '#0EA5E9', '#0FA968', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export interface TripListingPerson {
  /** Used to keep the host out of the crew row, and to colour the fallback. */
  id?: string | number | null;
  name: string;
  avatar?: string | null;
}

export interface TripListingHost extends TripListingPerson {
  /** Identity-verified traveller. Distinct from a Tripician Verified trip. */
  verified?: boolean;
}

export interface TripListingPrice {
  amount: number;
  /** ISO 4217. Falls back to a bare number when absent or unrecognised. */
  currency?: string | null;
}

export interface TripListingCardProps {
  /** Covers, in order. Dots appear only when there is genuinely more than one. */
  images: (string | null | undefined)[];
  title: string;
  onClick: () => void;

  /**
   * Where the trip goes. Rendered as flags over the top-left of the cover, and
   * as the uppercase code before the title. Pass the raw list: the shell
   * de-duplicates and title-cases it so no two surfaces can disagree.
   */
  countries?: string[] | null;

  host?: TripListingHost | null;
  /** Everyone else going. Rendered over the top-right of the cover. */
  members?: TripListingPerson[] | null;
  rating?: number | null;
  saves?: number;

  /** The owner's own words. Clamped to two lines. */
  description?: string | null;

  /** ISO. The fallback stamp when a trip has never been edited. */
  createdAt?: string | null;
  /** ISO. Drives "updated 3mo ago" on the summary line. */
  updatedAt?: string | null;
  /** Length of the itinerary. Renders as "7 nights plan". */
  nights?: number | null;

  /** Tripician Verified. Granted by an admin; the owner cannot set it. */
  verified?: boolean;
  verifiedAt?: string | null;

  /** Departure is going ahead: enough people have joined. */
  confirmed?: boolean;

  price?: TripListingPrice | null;
  /** Omit entirely when the trip is not recruiting. Zero renders as "Full". */
  spotsLeft?: number | null;

  /**
   * Extra pills stacked under the place pill, top-left. Pass plain badges - the
   * shell positions them, so no two callers can disagree about where a pill goes.
   */
  coverBadges?: React.ReactNode;
  /** Status pill, bottom-right of the cover. Kept apart from the top-left stack
   *  because "Live" is a state, not a label, and should not queue behind tags. */
  coverStatus?: React.ReactNode;
  /** Full-bleed strip directly under the cover, above the body. Currently the
   *  plan-progress hairline on your own trips. */
  underCover?: React.ReactNode;
  /** Per-surface actions, rendered under the listing rows on a hairline. */
  footer?: React.ReactNode;
  /** Fixed width turns the card into a rail item instead of a grid cell. */
  width?: number;
  /**
   * The bookmark saying what this card is. Defaults to a plan, because that is
   * what this shell renders; pass null on a surface where every card is already
   * unmistakably one thing.
   */
  typeTag?: CardTypeKind | null;
}

function formatPrice(price: TripListingPrice): string {
  const { amount, currency } = price;
  if (!currency) return String(Math.round(amount));
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unrecognised currency code must not take the card down with it.
    return `${currency} ${Math.round(amount)}`;
  }
}

const TripListingCard: React.FC<TripListingCardProps> = ({
  images,
  title,
  onClick,
  countries,
  host,
  members,
  rating,
  saves = 0,
  description,
  createdAt,
  updatedAt,
  nights,
  verified,
  verifiedAt,
  confirmed = false,
  price,
  spotsLeft,
  coverBadges,
  coverStatus,
  underCover,
  footer,
  width,
  typeTag = 'plan',
}) => {
  const theme = useTheme();

  const usable = React.useMemo(
    () => images.filter((s): s is string => typeof s === 'string' && s.length > 0),
    [images],
  );
  const [index, setIndex] = React.useState(0);
  const [failed, setFailed] = React.useState<Set<number>>(new Set());

  // A cover URL can be dead - a whole curated set 404ed once - so a failed load
  // steps to the placeholder rather than rendering the broken-image glyph.
  const current = failed.has(index) ? null : usable[index];
  const showsSeats = typeof spotsLeft === 'number' || !!price;

  const places = React.useMemo(() => normaliseCountries(countries), [countries]);
  const placeFlags = places.slice(0, PLACE_FLAGS);
  const placeExtra = places.length - placeFlags.length;

  const hostId = host?.id != null ? String(host.id) : '';

  // The host already has a 46px portrait on the cover. Some list payloads put the
  // owner in the member rows too, and the same face twice reads as two people.
  const crew = React.useMemo(
    () => (members ?? []).filter((m) => !hostId || String(m.id ?? '') !== hostId),
    [members, hostId],
  );
  const crewFaces = crew.slice(0, CREW_FACES);
  const crewExtra = crew.length - crewFaces.length;
  const crewTooltip = React.useMemo(() => {
    if (crew.length === 0) return '';
    const names = crew.slice(0, 8).map((m) => m.name).filter(Boolean);
    const rest = crew.length - names.length;
    return `${names.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`;
  }, [crew]);

  /**
   * "updated 3mo ago · 7 nights plan". One line, and the only one.
   *
   * This was two rows - an age line and a departure-date line - and between them
   * they spent four facts on a card whose job is to make someone open the trip.
   * What survives is the pair that actually decides that: how stale the plan is,
   * and how big it is. The departure date and the creation date live on the trip
   * itself.
   *
   * "updated" prefers the edit stamp and falls back to creation, because a trip
   * nobody has touched still has an honest answer to "how old is this".
   */
  const summary = React.useMemo(() => {
    const stamp = formatRelativeTime(updatedAt) || formatRelativeTime(createdAt);
    const stampSource = formatRelativeTime(updatedAt) ? updatedAt : createdAt;
    const when = stamp ? `updated ${stamp}` : null;

    const size =
      typeof nights === 'number' && nights > 0
        ? `${nights} ${nights === 1 ? 'night' : 'nights'} plan`
        : null;

    const text = [when, size].filter(Boolean).join(' · ');
    if (!text) return null;

    const absolute = formatAbsoluteDateTime(stampSource);
    return { text, tooltip: absolute ? `Last updated ${absolute}` : '' };
  }, [createdAt, updatedAt, nights]);

  /**
   * One token: a crew face on the right, a country flag on the left. A white ring
   * is what separates two of them from each other and all of them from whatever
   * the photo happens to be doing behind them.
   */
  const tokenSx = {
    width: TOKEN,
    height: TOKEN,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.94)',
    boxShadow: '0 1px 3px rgba(15,15,19,0.35)',
  } as const;

  /** The "+N" that closes either stack. */
  const overflowTokenSx = {
    ...tokenSx,
    ml: '-9px',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    bgcolor: 'rgba(15,15,19,0.72)',
    backdropFilter: 'blur(4px)',
  } as const;

  return (
    <Box
      component="article"
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        overflow: 'hidden',
        // String px: MUI multiplies a numeric sx borderRadius by the shape token.
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        ...(width ? { flex: '0 0 auto', width } : { height: '100%' }),
        '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-3px)' },
        '&:hover .listing-cover-img': { transform: 'scale(1.04)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      {/* ── Cover ── */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 3',
          overflow: 'hidden',
          bgcolor: theme.custom.surface.active,
          flexShrink: 0,
        }}
      >
        {typeTag !== null && <CardTypeTag kind={typeTag} />}

        {current ? (
          <Box
            component="img"
            className="listing-cover-img"
            src={current}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed((prev) => new Set(prev).add(index))}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }}
          />
        ) : (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <IconMapPin size={30} stroke={1.5} color={theme.palette.text.disabled} />
          </Box>
        )}

        {(places.length > 0 || coverBadges) && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              // Leave the top-right corner clear. A crew of four is wider than a
              // saves count, so a tag pill under the flags has to yield more room
              // when one is there, or it slides underneath the faces.
              maxWidth: `calc(100% - ${crew.length > 0 ? 136 : 90}px)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.6,
            }}
          >
            {places.length > 0 && (
              <Tooltip title={places.join(', ')} arrow placement="top">
                <Box
                  aria-label={places.join(', ')}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {placeFlags.map((c, i) => (
                    <Box
                      key={c}
                      sx={{
                        ...tokenSx,
                        ml: i === 0 ? 0 : '-9px',
                        overflow: 'hidden',
                        display: 'grid',
                        placeItems: 'center',
                        // Behind a flag that fails to load, so the ring is never
                        // a white circle sitting on a white sky.
                        bgcolor: 'rgba(15,15,19,0.45)',
                      }}
                    >
                      <CountryFlag country={c} size={TOKEN - 4} variant="circle" />
                    </Box>
                  ))}
                  {placeExtra > 0 && <Box sx={overflowTokenSx}>+{placeExtra}</Box>}
                </Box>
              </Tooltip>
            )}
            {coverBadges}
          </Box>
        )}

        {coverStatus && <Box sx={{ position: 'absolute', bottom: 12, right: 12 }}>{coverStatus}</Box>}

        {/* Top-right stack: who is going, then saves. Both live in one column so
            they cannot land on top of each other when a trip has both.

            Pushed down when a type tag is showing: the tag hangs from the very
            top edge, and at the old 12px the faces sat underneath it. */}
        {(crew.length > 0 || saves > 0) && (
          <Box
            sx={{
              position: 'absolute',
              top: typeTag === null ? 12 : 42,
              right: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.75,
            }}
          >
            {crew.length > 0 && (
              <Tooltip title={crewTooltip} arrow placement="top">
                <Box
                  aria-label={`${crew.length} ${crew.length === 1 ? 'traveller' : 'travellers'} going`}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {crewFaces.map((m, i) => (
                    <Avatar
                      key={m.id != null && m.id !== '' ? String(m.id) : `${m.name}-${i}`}
                      src={m.avatar ?? undefined}
                      alt=""
                      sx={{
                        ...tokenSx,
                        ml: i === 0 ? 0 : '-9px',
                        bgcolor: avatarColor(String(m.id ?? m.name ?? i)),
                      }}
                    >
                      {m.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                  ))}
                  {crewExtra > 0 && <Box sx={overflowTokenSx}>+{crewExtra}</Box>}
                </Box>
              </Tooltip>
            )}

            {/* Saves. Hidden at zero: "0 saved" on a new trip reads as a verdict. */}
            {saves > 0 && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1,
                  py: 0.4,
                  borderRadius: 999,
                  typography: 'caption',
                  fontWeight: 600,
                  color: '#fff',
                  bgcolor: 'rgba(15,15,19,0.5)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <IconStarFilled size={11} />
                {saves}
              </Box>
            )}
          </Box>
        )}

        {/* Dots only when there is more than one cover, so the control never
            implies content that is not there. */}
        {usable.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 0.6,
            }}
          >
            {usable.map((_, i) => (
              <Box
                key={i}
                component="button"
                type="button"
                aria-label={`Cover ${i + 1} of ${usable.length}`}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                sx={{
                  width: 6,
                  height: 6,
                  p: 0,
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  bgcolor: i === index ? 'primary.main' : 'rgba(255,255,255,0.7)',
                  transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                }}
              />
            ))}
          </Box>
        )}

        {host && (
          <Box sx={{ position: 'absolute', left: 12, bottom: 12 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar
                src={host.avatar ?? undefined}
                sx={{
                  width: 46,
                  height: 46,
                  bgcolor: 'primary.main',
                  typography: 'subtitle1',
                  border: '3px solid #fff',
                  boxShadow: theme.custom.shadows.card,
                }}
              >
                {host.name?.charAt(0)?.toUpperCase() ?? <IconUser size={20} />}
              </Avatar>
              <IdentityVerifiedMark verified={host.verified} />
            </Box>
          </Box>
        )}
      </Box>

      {underCover}

      {/* ── Body ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        {/* The badge needs its own flex row rather than sitting inline: the title
            is a clamped `-webkit-box`, so anything inside it becomes part of the
            clamped text and can be truncated away on a two-line title.

            The row wraps, and the title claims a floor of 10rem before it will
            give ground. Without that floor a three-up grid squeezed the name to
            "qwwe12300(" to keep the endorsement on the same line, which is the
            wrong trade: the pill drops to its own line instead. */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              flex: '1 1 auto',
              minWidth: '10rem',
              color: 'text.primary',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </Typography>
          <VerifiedTripBadge verified={verified} verifiedAt={verifiedAt} variant="pill" />
        </Box>

        {description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        )}

        {/* The summary line, plus the two marks that qualify it. The rating sits
            at the far end, because dropping the "with {host}" line left it as the
            only thing on a row of its own. */}
        {(summary || confirmed || (typeof rating === 'number' && rating > 0)) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {summary && (
              <Tooltip title={summary.tooltip} arrow placement="top">
                <Typography variant="body2" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                  {summary.text}
                </Typography>
              </Tooltip>
            )}
            {confirmed && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, color: 'success.main', flexShrink: 0 }}>
                <IconCheck size={13} stroke={3} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Confirmed
                </Typography>
              </Box>
            )}
            <Box sx={{ flex: 1 }} />
            {typeof rating === 'number' && rating > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
                <IconStarFilled size={12} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {rating.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* The seats row. Present only on a trip someone can actually join, which
            is what keeps this the same component as a plain community card. */}
        {showsSeats && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 'auto', pt: 0.75 }}>
            {price && (
              <Typography variant="h6" component="p" sx={{ color: 'text.primary' }}>
                {formatPrice(price)}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            {typeof spotsLeft === 'number' && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  flexShrink: 0,
                  color: spotsLeft === 0 ? 'text.disabled' : 'primary.main',
                }}
              >
                <IconUser size={13} stroke={2} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {spotsLeft === 0
                    ? 'Full'
                    : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {footer && (
          <Box
            sx={{
              mt: showsSeats ? 1 : 'auto',
              pt: 1.25,
              borderTop: `1px solid ${theme.custom.surface.border}`,
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TripListingCard;
