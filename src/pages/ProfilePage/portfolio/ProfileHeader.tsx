import React from 'react';
import { Avatar, Box, ButtonBase, IconButton, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import {
  IconCalendar, IconHeart, IconMap, IconMapPin, IconSparkles,
} from '@tabler/icons-react';
import VerifiedProfileMark from '../../../components/ui/VerifiedProfileMark';
import type { ProfileSocial } from './socials';
import type { BioHighlight } from '../profileBio';

export interface ProfileStat {
  /** Null while unknown: a zero is a claim, so nothing paints until it is real. */
  value: number | string | null;
  label: string;
  /** The country count: the one figure in the brand colour. */
  brand?: boolean;
  onClick?: () => void;
}

export type { ProfileSocial };

/**
 * The cover band. Edge to edge on a phone, a rounded panel from tablet up. The
 * owner's own photo, else whatever fallback the page found, else a quiet brand
 * wash; never text over it, so no photograph has to be chosen for legibility.
 */
const Cover: React.FC<{ src?: string | null; onError?: () => void }> = ({ src, onError }) => {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => setLoaded(false), [src]);
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        mx: { xs: -2, sm: 0 },
        height: { xs: 176, sm: 230, md: 290 },
        borderRadius: { xs: 0, sm: '24px' },
        overflow: 'hidden',
        background: theme.custom.gradients.brandSubtle,
      })}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={onError}
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scale(1)' : 'scale(1.02)',
            transition: `opacity ${theme.custom.motion.duration.slow} ease, transform 900ms ${theme.custom.motion.easing.standard}`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
          })}
        />
      ) : null}
      {/* A breath of shade at the foot, so the avatar's ring sits on the photo rather than floating on it. */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.16), transparent 38%)', pointerEvents: 'none' }} />
    </Box>
  );
};

// Highlights store feather-style icon NAMES ("heart", "map-pin"), mapped here, or an emoji, drawn as text.
const HIGHLIGHT_ICONS: Record<string, React.ElementType> = { heart: IconHeart, map: IconMap, 'map-pin': IconMapPin };

const HighlightIcon: React.FC<{ icon: string | null }> = ({ icon }) => {
  const name = (icon || '').trim();
  const Mapped = HIGHLIGHT_ICONS[name.toLowerCase()];
  if (Mapped) return <Mapped size={15} stroke={1.8} />;
  if (name && /[^\x20-\x7E]/.test(name)) return <>{name}</>;
  return <IconSparkles size={15} stroke={1.8} />;
};

/** "I'm a photographer", "My dream place is Iceland": the person's own short lines, as quiet chips. */
const Highlights: React.FC<{ items: BioHighlight[] }> = ({ items }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mt: 2, maxWidth: 680 }}>
    {items.map((h, i) => (
      <Box
        key={`${h.label}-${i}`}
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          maxWidth: '100%',
          px: 1.5,
          py: 0.6,
          borderRadius: 999,
          bgcolor: theme.custom.surface.hover,
        })}
      >
        <Box sx={{ display: 'flex', flexShrink: 0, color: 'primary.main' }}><HighlightIcon icon={h.icon} /></Box>
        <Typography variant="body2" noWrap sx={{ fontSize: '0.8125rem' }}>
          {h.label ? <Box component="span" sx={{ color: 'text.secondary' }}>{h.label} </Box> : null}
          <Box component="span" sx={{ fontWeight: 600 }}>{h.value}</Box>
        </Typography>
      </Box>
    ))}
  </Box>
);

/** 1,284 in full; past ten thousand, 12.4K, as the app shortens it. */
function formatCount(n: number): string {
  return n >= 10000
    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : n.toLocaleString();
}

const Stat: React.FC<{ stat: ProfileStat; first: boolean }> = ({ stat, first }) => {
  const theme = useTheme();
  const brandInk = theme.palette.mode === 'light' ? theme.custom.brand.onLight : theme.custom.brand.onDark;
  const content = (
    <>
      {stat.value === null ? (
        <Skeleton variant="text" width={36} sx={{ fontSize: { xs: 22, md: 26 }, mx: 'auto' }} />
      ) : (
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontFamily: theme.custom.fontDisplay,
            fontWeight: 700,
            fontSize: { xs: '1.375rem', md: '1.625rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            fontVariantNumeric: 'tabular-nums',
            color: stat.brand ? brandInk : 'text.primary',
          }}
        >
          {typeof stat.value === 'number' ? formatCount(stat.value) : stat.value}
        </Typography>
      )}
      <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mt: 0.25 }}>
        {stat.label}
      </Typography>
    </>
  );
  const shared = {
    position: 'relative',
    minWidth: { xs: 92, md: 124 },
    px: { xs: 1.5, md: 2.5 },
    py: 1,
    textAlign: 'center',
    // A hairline between figures, never before the first.
    ...(first
      ? null
      : {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '22%',
            bottom: '22%',
            width: '1px',
            bgcolor: theme.custom.surface.border,
          },
        }),
  } as const;
  if (!stat.onClick) return <Box sx={shared}>{content}</Box>;
  return (
    <ButtonBase
      onClick={stat.onClick}
      aria-label={`${stat.value ?? ''} ${stat.label}`}
      sx={{
        ...shared,
        display: 'block',
        borderRadius: '12px',
        fontFamily: 'inherit',
        transition: `background-color ${theme.custom.motion.duration.fast} ease`,
        '&:hover': { bgcolor: theme.custom.surface.hover },
        '&:hover::before': { opacity: 0 },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}` },
      }}
    >
      {content}
    </ButtonBase>
  );
};

/**
 * Who this is, as the app shows it: the cover, the photo centred on its edge,
 * the name with the Verified badge, where they are, their own words, three
 * figures, then the one action that matters here. Centred and spare on purpose:
 * it is the title page of the profile, and everything below it is the story.
 */
const ProfileHeader: React.FC<{
  loading?: boolean;
  name: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  onCoverError?: () => void;
  verified?: boolean;
  verifiedAt?: string | null;
  location?: string | null;
  joinedLine?: string | null;
  intro?: string | null;
  /** Owner without an intro: a quiet prompt where the words would be. */
  introPrompt?: React.ReactNode;
  highlights?: BioHighlight[];
  socials?: ProfileSocial[];
  stats: ProfileStat[];
  actions?: React.ReactNode;
  /** Facts that back the person up, under the actions. */
  footnote?: React.ReactNode;
}> = ({
  loading,
  name,
  avatarUrl,
  coverUrl,
  onCoverError,
  verified,
  verifiedAt,
  location,
  joinedLine,
  intro,
  introPrompt,
  highlights = [],
  socials = [],
  stats,
  actions,
  footnote,
}) => {
  const theme = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'T';

  return (
    <Box component="header">
      <Cover src={coverUrl} onError={onCoverError} />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', px: { xs: 0, sm: 2 } }}>
        <Box sx={{ mt: { xs: '-52px', md: '-68px' }, position: 'relative', zIndex: 1 }}>
          {loading ? (
            <Skeleton variant="circular" sx={{ width: { xs: 104, md: 136 }, height: { xs: 104, md: 136 }, border: `5px solid ${theme.palette.background.default}` }} />
          ) : (
            <Avatar
              src={avatarUrl || undefined}
              alt={name}
              sx={{
                width: { xs: 104, md: 136 },
                height: { xs: 104, md: 136 },
                fontSize: { xs: '2.25rem', md: '2.875rem' },
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: '#fff',
                border: `5px solid ${theme.palette.background.default}`,
                boxShadow: theme.custom.shadows.card,
              }}
            >
              {!avatarUrl && initials}
            </Avatar>
          )}
        </Box>

        {loading ? (
          <>
            <Skeleton variant="text" width={240} sx={{ fontSize: '2rem', mt: 1.5 }} />
            <Skeleton variant="text" width={160} />
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: { xs: 1.5, md: 2 }, maxWidth: '100%' }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: theme.custom.fontDisplay,
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', md: '2.375rem' },
                  letterSpacing: '-0.025em',
                  lineHeight: 1.12,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {name}
              </Typography>
              <Box sx={{ flexShrink: 0, display: 'flex' }}>
                <VerifiedProfileMark verified={!!verified} verifiedAt={verifiedAt} size={24} />
              </Box>
            </Box>

            {location || joinedLine ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 0.75, color: 'text.secondary' }}>
                {location ? (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <IconMapPin size={15} stroke={1.8} />
                    <Typography variant="body2" sx={{ color: 'inherit' }}>{location}</Typography>
                  </Box>
                ) : null}
                {joinedLine ? (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <IconCalendar size={15} stroke={1.8} />
                    <Typography variant="body2" sx={{ color: 'inherit' }}>{joinedLine}</Typography>
                  </Box>
                ) : null}
              </Box>
            ) : null}

            {intro ? (
              <Typography
                sx={{ mt: 1.75, maxWidth: 580, color: 'text.secondary', fontSize: { xs: '0.9375rem', md: '1rem' }, lineHeight: 1.6, whiteSpace: 'pre-line', textWrap: 'pretty' }}
              >
                {intro}
              </Typography>
            ) : introPrompt ? (
              <Box sx={{ mt: 1.25 }}>{introPrompt}</Box>
            ) : null}

            {highlights.length ? <Highlights items={highlights} /> : null}

          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 2.5, md: 3 } }}>
          {stats.map((stat, i) => <Stat key={stat.label} stat={stat} first={i === 0} />)}
        </Box>

        {actions || socials.length ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              justifyContent: 'center',
              gap: 1,
              rowGap: 1.5,
              mt: { xs: 2.5, md: 3 },
              width: '100%',
              maxWidth: { xs: 420, sm: 'none' },
              '& > .MuiButton-root': { flex: { xs: 1, sm: '0 0 auto' }, minWidth: { sm: 168 }, whiteSpace: 'nowrap' },
            }}
          >
            {actions}
            {/* Where to find them elsewhere sits with what you can do here, on one row from a
                tablet up. A phone has no room for both, so the links take a centred line below. */}
            {socials.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexBasis: { xs: '100%', sm: 'auto' } }}>
            {socials.map(({ url, Icon, label }) => (
              <Tooltip key={label} title={label}>
                <IconButton
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    color: 'text.secondary',
                    border: `1px solid ${theme.custom.surface.border}`,
                    '&:hover': { color: 'text.primary', bgcolor: theme.custom.surface.hover },
                  }}
                >
                  <Icon size={18} stroke={1.8} />
                </IconButton>
              </Tooltip>
            ))}
              </Box>
            ) : null}
          </Box>
        ) : null}

        {footnote ? <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center', width: '100%' }}>{footnote}</Box> : null}
      </Box>
    </Box>
  );
};

export default ProfileHeader;
