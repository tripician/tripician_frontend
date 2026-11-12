import React from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { IconCircleCheckFilled, IconHome, IconMapPinFilled, IconPlus } from '@tabler/icons-react';
import CountryFlag from '../../../components/ui/CountryFlag';
import type { TravelCountry } from '../travelHistory';
import { profileFlags, type FlagKind, type LocationCountry, type ProfileFlag } from './stamps';

const KIND_ICON: Record<FlagKind, React.ElementType> = {
  home: IconHome,
  trip: IconCircleCheckFilled,
  location: IconMapPinFilled,
};

const KIND_LABEL: Record<FlagKind, string> = {
  home: 'Home country',
  trip: 'Trip verified',
  location: 'Location verified',
};

const SIZE = { xs: 56, md: 64 } as const;

/** One stamp: the flag in a ring (ink for home, brand red for an earned one), its kind at the corner, the name under it. */
const Stamp: React.FC<{ flag: ProfileFlag }> = ({ flag }) => {
  const KindIcon = KIND_ICON[flag.kind];
  const home = flag.kind === 'home';
  return (
    <Tooltip title={`${flag.name} · ${KIND_LABEL[flag.kind]}`} arrow>
      <Box
        role="listitem"
        aria-label={`${flag.name}, ${KIND_LABEL[flag.kind].toLowerCase()}`}
        sx={{ width: { xs: 72, md: 80 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0 }}
      >
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={(theme) => ({
              width: SIZE,
              height: SIZE,
              borderRadius: '50%',
              p: '3px',
              border: `2px solid ${home ? theme.palette.text.primary : theme.palette.primary.main}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              '& img, & span': { width: '100% !important', height: '100% !important' },
            })}
          >
            <CountryFlag country={flag.code ?? flag.name} variant="circle" size={56} />
          </Box>
          <Box
            sx={(theme) => ({
              position: 'absolute',
              right: -3,
              bottom: -3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              boxShadow: `0 0 0 2px ${theme.palette.background.default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: home ? 'text.primary' : 'primary.main',
            })}
          >
            <KindIcon size={15} />
          </Box>
        </Box>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', maxWidth: '100%', fontWeight: 500 }}>
          {flag.name}
        </Typography>
      </Box>
    </Tooltip>
  );
};

/**
 * A profile's travel stamps, the app's row of verified flags: home first, then
 * every country someone else can vouch for, in the order it was reached.
 * Centred while it fits, scrolling sideways when it does not. Nothing is drawn
 * for a visitor when there is no stamp to show.
 */
const TravelStamps: React.FC<{
  countries: readonly TravelCountry[];
  locationCountries?: readonly LocationCountry[];
  homeCountry?: string | null;
  /** Own profile without a home country: a Home slot that opens Settings. */
  onAddHome?: () => void;
}> = ({ countries, locationCountries, homeCountry, onAddHome }) => {
  const flags = React.useMemo(
    () => profileFlags({ homeCountry, countries, locationCountries }),
    [homeCountry, countries, locationCountries],
  );
  const missingHome = !!onAddHome && !flags.some((f) => f.kind === 'home');
  if (!flags.length && !missingHome) return null;
  const kinds = (['home', 'trip', 'location'] as const).filter((k) => flags.some((f) => f.kind === k));

  return (
    <Box component="section" aria-label="Travel stamps" sx={{ textAlign: 'center' }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, letterSpacing: '0.14em' }}>
        Travel stamps
      </Typography>
      <Box sx={{ overflowX: 'auto', mx: { xs: -2, sm: 0 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {/* max-content plus auto margins: centred while it fits, scrolling from the start when it does not. */}
        <Box role="list" sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, width: 'max-content', mx: 'auto', px: { xs: 2, sm: 0 }, pb: 0.5 }}>
          {missingHome ? (
            <ButtonBase
              onClick={onAddHome}
              aria-label="Add your home country in Settings"
              sx={(theme) => ({
                width: { xs: 72, md: 80 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                borderRadius: '12px',
                fontFamily: 'inherit',
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}` },
                '&:hover .add-ring': { bgcolor: theme.custom.brand.tint.soft },
              })}
            >
              <Box
                className="add-ring"
                sx={(theme) => ({
                  width: SIZE,
                  height: SIZE,
                  borderRadius: '50%',
                  border: `2px dashed ${theme.palette.primary.main}`,
                  bgcolor: theme.custom.brand.tint.subtle,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: `background-color ${theme.custom.motion.duration.fast} ease`,
                })}
              >
                <IconPlus size={22} />
              </Box>
              <Typography variant="caption" sx={(theme) => ({ fontWeight: 600, color: theme.palette.mode === 'light' ? theme.custom.brand.onLight : theme.custom.brand.onDark })}>
                Home
              </Typography>
            </ButtonBase>
          ) : null}
          {flags.map((flag) => <Stamp key={`${flag.kind}:${flag.code ?? flag.name}`} flag={flag} />)}
        </Box>
      </Box>
      {kinds.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: { xs: 1.5, md: 2.5 }, mt: 1.25 }}>
          {kinds.map((kind) => {
            const Icon = KIND_ICON[kind];
            return (
              <Box key={kind} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: kind === 'home' ? 'text.primary' : 'primary.main' }}>
                <Icon size={13} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{KIND_LABEL[kind]}</Typography>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
};

export default TravelStamps;
