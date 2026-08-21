/**
 * The travel passport: who this traveller is, in one band.
 *
 * Replaces two things that were both failing at the job: a 300px globe that
 * rendered only above 1200px and was mostly ocean, and a 300px sidebar whose
 * column was unconditional while all three of its cards were conditional, so a
 * traveller with no trips got an empty gutter. A full-width band under the
 * identity row fixes both and returns the tab content to a three-up grid.
 *
 * **One source, one arrival time.** The band takes a single `PassportView` that
 * the calling page assembles. The first version took `tripCount` and
 * `countryCount` as client-derived numbers while nights, countries and vibes
 * came from `/api/trips/vibe-passport`, and mid-load it rendered a combination
 * true of nobody: "0 countries" beside "138 nights", above a tab bar reading
 * "Trips (15)". Mixing sources inside a component that presents them as one fact
 * is the bug; the shape below is the fix.
 *
 * Nothing here fetches or is interactive, so it stays a pure function of props.
 */

import React from 'react';
import { Box, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  IconCake,
  IconGenderBigender,
  IconHeart,
  IconMail,
  IconMap,
  IconMapPin,
  IconPhone,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react';
import CountryFlag from '../../components/ui/CountryFlag';
import { VIBES } from '../CommunityPage/vibes';

/** The wire shape of /api/trips/vibe-passport. */
export interface VibePassport {
  vibes: Array<{ name: string; count: number; percentage: number }>;
  topCountries: string[];
  totalNights: number;
  totalTrips: number;
  favoriteVibe: string | null;
}

/**
 * What the band renders. Deliberately not the wire shape: the public profile has
 * no passport endpoint and assembles this from the trips it already fetched, so
 * the component must not assume where any field came from.
 */
export interface PassportView {
  trips: number;
  nights: number;
  countries: string[];
  vibes: Array<{ name: string; percentage: number }>;
  favoriteVibe: string | null;
}

/** The common case: straight from the authenticated passport endpoint. */
export function passportViewFromDto(dto: VibePassport | null): PassportView | null {
  if (!dto) return null;
  return {
    trips: dto.totalTrips ?? 0,
    nights: dto.totalNights ?? 0,
    countries: dto.topCountries ?? [],
    vibes: (dto.vibes ?? []).map((v) => ({ name: v.name, percentage: v.percentage })),
    favoriteVibe: dto.favoriteVibe ?? null,
  };
}

const vibeLabel = (key: string): string =>
  VIBES[key?.toLowerCase?.()]?.label ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');

// ── passport band ───────────────────────────────────────────────────────────

interface ProfilePassportProps {
  passport: PassportView | null;
  /** True until the data is known. A zero is a claim, so it must not paint first. */
  loading?: boolean;
  /** Rendered in the empty state, so a new traveller gets an invitation not a wall of zeros. */
  onPlanTrip?: () => void;
  /** Public profiles hide the band entirely rather than address the viewer as its owner. */
  hideWhenEmpty?: boolean;
}

export const ProfilePassport: React.FC<ProfilePassportProps> = ({
  passport,
  loading = false,
  onPlanTrip,
  hideWhenEmpty = false,
}) => {
  const theme = useTheme();

  const shell = {
    borderRadius: '20px',
    border: `1px solid ${theme.custom.surface.border}`,
    bgcolor: 'background.paper',
    boxShadow: theme.custom.shadows.card,
  } as const;

  // Skeleton of the band's own shape. Without this the page painted zeros while
  // the request was still in flight, then swapped them for real numbers, which
  // is worse than showing nothing: the zeros are read as facts.
  if (loading || !passport) {
    return (
      <Box sx={{ ...shell, p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', gap: { xs: 2.5, sm: 3.5 }, alignItems: 'flex-end' }}>
          {[0, 1, 2].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width={56} height={40} />
              <Skeleton variant="text" width={64} height={14} />
            </Box>
          ))}
          <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
            <Skeleton variant="text" width={64} height={14} />
            <Skeleton variant="rectangular" height={16} sx={{ borderRadius: '2px', maxWidth: 220 }} />
          </Box>
        </Box>
      </Box>
    );
  }

  const { trips, nights, countries, vibes, favoriteVibe } = passport;
  const hasAnything = trips > 0 || countries.length > 0 || nights > 0;

  if (!hasAnything) {
    if (hideWhenEmpty) return null;
    // Three zeros is a worse first impression than an empty page, and this is the
    // most common first view. Say what the band will become instead of reporting
    // that the traveller has done nothing.
    return (
      <Box sx={{ ...shell, p: { xs: 2.5, sm: 3 }, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 44,
            height: 44,
            borderRadius: '14px',
            flexShrink: 0,
            color: 'primary.main',
            bgcolor: theme.custom.surface.brandTint,
          }}
        >
          <IconWorld size={22} stroke={1.7} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
            Your travel passport starts empty
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Countries, nights and the vibes you lean towards fill in as you plan and publish trips.
          </Typography>
        </Box>
        {onPlanTrip && (
          <Box
            component="button"
            type="button"
            onClick={onPlanTrip}
            sx={{
              flexShrink: 0,
              border: `1px solid ${theme.custom.surface.border}`,
              bgcolor: 'transparent',
              borderRadius: 999,
              px: 2,
              py: 0.75,
              cursor: 'pointer',
              fontFamily: 'inherit',
              typography: 'button',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            Plan a trip
          </Box>
        )}
      </Box>
    );
  }

  // Zeros are dropped rather than rendered. A tile reading "0 nights" is not a
  // fact about the traveller, it is a gap in what we were told: the public
  // profile has no passport endpoint and never knows the night count.
  const stats = [
    { value: countries.length, label: countries.length === 1 ? 'country' : 'countries' },
    { value: trips, label: trips === 1 ? 'trip' : 'trips' },
    { value: nights, label: nights === 1 ? 'night' : 'nights' },
  ].filter((s) => s.value > 0);

  return (
    <Box sx={shell}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 2.5, md: 4 },
          p: { xs: 2.5, sm: 3 },
        }}
      >
        {/* The numbers lead, because they are what answers "who is this
            traveller" at a glance. Cells do not flex: one surviving tile should
            look like one tile, not a stretched band. */}
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          {stats.map((s, i) => (
            <Box
              key={s.label}
              sx={{
                flex: '0 0 auto',
                pr: { xs: 2.5, sm: 3.5 },
                pl: i > 0 ? { xs: 2.5, sm: 3.5 } : 0,
                borderLeft: i > 0 ? `1px solid ${theme.custom.surface.border}` : 'none',
              }}
            >
              <Typography variant="h3" sx={{ color: 'text.primary', lineHeight: 1.05 }}>
                {s.value}
              </Typography>
              <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {countries.length > 0 && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 0.75 }}>
              Been to
            </Typography>
            {/* Flags rather than the outlined name chips this replaced: eight
                chips wrapped to three lines and read as a tag cloud, where eight
                flags read as one row of places. CountryFlag is what makes that
                safe cross-platform, and it falls back to a globe for the city
                names and misspellings this free-text field collects. */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
              {countries.slice(0, 12).map((c, i) => (
                <CountryFlag key={`${c}-${i}`} country={c} size={24} showTooltip />
              ))}
              {countries.length > 12 && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                  +{countries.length - 12}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {vibes.length > 0 && (
        <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: { xs: 2.5, sm: 3 } }}>
          <Box
            sx={{
              pt: 2.5,
              borderTop: `1px solid ${theme.custom.surface.border}`,
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              flexWrap: 'wrap',
              mb: 1.5,
            }}
          >
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>
              How you travel
            </Typography>
            {/* `favoriteVibe` was declared in two files and rendered in none,
                and it is the single most identity-carrying field on the page. */}
            {favoriteVibe && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                mostly {vibeLabel(favoriteVibe).toLowerCase()} trips
              </Typography>
            )}
          </Box>
          <VibeMix vibes={vibes} />
        </Box>
      )}
    </Box>
  );
};

/**
 * One stacked bar rather than a bar per vibe.
 *
 * Four separate tracks showed real values of 17/8/8/8 as ~20px nubs stranded on
 * ~290px runways, which read as four empty things rather than one composition.
 * Stacking them also makes an omission visible that four bars hid: these
 * percentages are shares of ALL trips, so 17+8+8+8 means most trips carry no
 * vibe at all. That remainder is drawn, in neutral, and labelled, because it is
 * both the honest reading and the nudge that gets vibes filled in.
 */
const VibeMix: React.FC<{ vibes: Array<{ name: string; percentage: number }> }> = ({ vibes }) => {
  const theme = useTheme();

  const top = vibes.slice(0, 4);
  const named = top.reduce((sum, v) => sum + Math.max(0, v.percentage), 0);
  const unset = Math.max(0, 100 - named);

  // Descending weight off the brand colour rather than a palette of hues: a
  // multicolour bar would be a chart, and this is an identity element.
  const tint = (i: number) => alpha(theme.palette.primary.main, [1, 0.7, 0.48, 0.32][i] ?? 0.32);

  const segments = [
    ...top.map((v, i) => ({ key: v.name, label: vibeLabel(v.name), pct: v.percentage, color: tint(i) })),
    ...(unset > 1
      ? [{ key: '__unset', label: 'no vibe set', pct: unset, color: theme.custom.surface.active }]
      : []),
  ];

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          height: 10,
          borderRadius: 99,
          overflow: 'hidden',
          bgcolor: theme.custom.surface.active,
          gap: '2px',
        }}
      >
        {segments.map((s) => (
          <Tooltip key={s.key} title={`${s.label} ${Math.round(s.pct)}%`} arrow placement="top">
            <Box
              sx={{
                // A 2% share still has to be visible and hoverable, so segments
                // get a floor. The label always carries the true number.
                flex: `${Math.max(s.pct, 2)} 1 0`,
                minWidth: 4,
                bgcolor: s.color,
                transition: `flex-grow ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
              }}
            />
          </Tooltip>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, sm: 2.5 }, mt: 1.5 }}>
        {segments.map((s) => (
          <Box key={s.key} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {s.label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {Math.round(s.pct)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );
};

// ── details row ─────────────────────────────────────────────────────────────

// Bio highlights store feather-style icon NAMES ("heart", "map-pin"), which have
// to be mapped to real components or the raw name renders as text.
const HIGHLIGHT_ICONS: Record<string, React.ElementType> = {
  heart: IconHeart,
  map: IconMap,
  'map-pin': IconMapPin,
};

const HighlightIcon: React.FC<{ icon?: string }> = ({ icon }) => {
  const name = (icon || '').trim();
  const Mapped = HIGHLIGHT_ICONS[name.toLowerCase()];
  if (Mapped) return <Mapped size={16} stroke={1.8} />;
  // Emoji, or any non-ASCII glyph, stored directly is fine to render as text.
  if (name && /[^\x20-\x7E]/.test(name)) return <>{name}</>;
  return <IconSparkles size={16} stroke={1.8} />;
};

/**
 * Placeholder strings the backend stores when a field was never filled in.
 * Rendering "Country: Not Available" is worse than rendering nothing: it draws
 * the eye to an absence and makes the profile look broken rather than sparse.
 */
const PLACEHOLDERS = new Set(['not available', 'n/a', 'na', 'none', 'null', 'undefined', '-']);

const presentable = (value?: string | null): string | undefined => {
  const v = value?.trim();
  if (!v || PLACEHOLDERS.has(v.toLowerCase())) return undefined;
  return v;
};

interface ProfileDetailsProps {
  profile: any;
}

/**
 * Bio highlights and contact details, as one wrapped row rather than two stacked
 * sidebar cards. The highlights ("I'm a/an", "My dream place is", "I'm from")
 * are the most human thing on the page and used to sit last, bottom right, in a
 * 300px column.
 *
 * Returns null when there is nothing to show, which the old sidebar could not do
 * because its column was rendered unconditionally around it.
 */
export const ProfileDetails: React.FC<ProfileDetailsProps> = ({ profile }) => {
  const theme = useTheme();

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;

  const highlights: Array<{ icon?: string; label?: string; value?: string }> = Array.isArray(profile.bio?.highlights)
    ? profile.bio.highlights
    : [];

  const details: Array<{ Icon: React.ElementType; value: string }> = [
    { Icon: IconMail, value: presentable(profile.email) },
    { Icon: IconPhone, value: presentable(profile.phone) },
    { Icon: IconWorld, value: presentable(profile.country) },
    {
      Icon: IconGenderBigender,
      value: presentable(profile.gender && profile.gender !== 'NA' ? profile.gender : undefined),
    },
    { Icon: IconCake, value: presentable(formatDate(profile.dateOfBirth)) },
  ].flatMap((d) => (d.value ? [{ Icon: d.Icon as React.ElementType, value: d.value }] : []));

  // `intro` is prose and renders as the epigraph above; a 600 character pill
  // would blow the row apart.
  const shownHighlights = highlights.filter(
    (h) => presentable(h.value) && (h as { key?: string }).key !== 'intro',
  );

  if (shownHighlights.length === 0 && details.length === 0) return null;

  const pill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    borderRadius: 999,
    border: `1px solid ${theme.custom.surface.border}`,
    px: 1.5,
    py: 0.75,
    minWidth: 0,
    maxWidth: '100%',
  } as const;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {shownHighlights.map((h, i) => (
        <Box key={`h-${i}`} sx={{ ...pill, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', flexShrink: 0, color: 'primary.main' }}>
            <HighlightIcon icon={h.icon} />
          </Box>
          <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 500 }}>
            {h.label ? `${h.label} ` : ''}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
              {h.value}
            </Box>
          </Typography>
        </Box>
      ))}

      {details.map((d, i) => (
        <Box key={`d-${i}`} sx={{ ...pill, bgcolor: 'transparent' }}>
          <Box sx={{ display: 'flex', flexShrink: 0, color: 'text.disabled' }}>
            <d.Icon size={16} stroke={1.8} />
          </Box>
          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
            {d.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
