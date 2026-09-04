import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { APP_NAV_ITEMS, DESKTOP_NAV_MIN_WIDTH } from '../navConfig';

/**
 * Items shown LEFT of the plan-a-trip FAB.
 *
 * Community then Stories: the two reading surfaces sit together, which is what
 * someone opening the app without a trip to plan is actually here for.
 */
const MOBILE_NAV_LEFT = ['explore', 'stories'] as const;
/**
 * Items shown RIGHT of the plan-a-trip FAB.
 *
 * Profile is here rather than in the More drawer because it now holds every one
 * of your trips. Leaving it behind a drawer would put your own trips two taps
 * deep on the surface where most planning actually happens.
 *
 * From the road sits between them, in the slot the More button used to take.
 * More held exactly one item (Crew), and Crew is now a segment on Browse, so the
 * button had nothing left to open. The order mirrors the desktop pill: the two
 * reading surfaces, the orb, then the two you make things on.
 */
const MOBILE_NAV_RIGHT = ['navia', 'road', 'profile'] as const;

interface AppBottomNavProps {
  onCreateTrip: () => void;
}

const AppBottomNav: React.FC<AppBottomNavProps> = ({ onCreateTrip }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const leftItems  = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_LEFT  as readonly string[]).includes(i.id));
  const rightItems = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_RIGHT as readonly string[]).includes(i.id));

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      component="nav"
      aria-label="Mobile navigation"
      sx={{
        // Paired with the header's centred nav through one shared width, so
        // there is never a viewport with both or with neither.
        display: 'flex',
        [`@media (min-width:${DESKTOP_NAV_MIN_WIDTH}px)`]: { display: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        height: 72,
        alignItems: 'stretch',
        justifyContent: 'space-around',
        px: 0.5,
        pb: 'env(safe-area-inset-bottom, 0px)',
        background: (t) =>
          t.palette.mode === 'light'
            ? 'rgba(255,255,255,0.96)'
            : 'rgba(15,15,19,0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {leftItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Box
            key={item.id}
            component="button"
            onClick={() => navigate(item.path)}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.35,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? 'primary.main' : 'text.disabled',
              py: 1,
            }}
          >
            <item.Icon size={22} stroke={1.75} color="currentColor" />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: active ? 700 : 600,}}>
              {item.shortLabel}
            </Typography>
          </Box>
        );
      })}

      {/*  Plan-a-trip FAB - centre slot  */}
      <Box
        component="button"
        onClick={onCreateTrip}
        aria-label="Plan a trip"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          mt: -2.5,
        }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: '#fff',
            /* Neutral, not coral. This tile genuinely floats over scrolling
               content and has no border, so it keeps an elevation cue - but a
               grey one, which reads as depth rather than as brand glow. */
            boxShadow: (t) => t.custom.shadows.card,
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 28 }} />
        </Box>
        {/* 11 characters at 0.62rem is about 34px, inside a flex:1 slot that is
            ~72px on a 360px phone, so it fits without wrapping. */}
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'primary.main', mt: 0.25, whiteSpace: 'nowrap' }}>
          Plan a trip
        </Typography>
      </Box>

      {rightItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Box
            key={item.id}
            component="button"
            onClick={() => navigate(item.path)}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.35,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? 'primary.main' : 'text.disabled',
              py: 1,
            }}
          >
            <item.Icon size={22} stroke={1.75} color="currentColor" />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: active ? 700 : 600,}}>
              {item.shortLabel}
            </Typography>
          </Box>
        );
      })}

    </Box>
  );
};

export default AppBottomNav;
