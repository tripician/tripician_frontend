import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import { APP_NAV_ITEMS } from '../navConfig';

/** Items shown LEFT of the New Trip FAB */
const MOBILE_NAV_LEFT = ['home', 'trips'] as const;
/** Items shown RIGHT of the New Trip FAB */
const MOBILE_NAV_RIGHT = ['community'] as const;

interface AppBottomNavProps {
  onCreateTrip: () => void;
  onMoreMenu: () => void;
}

const AppBottomNav: React.FC<AppBottomNavProps> = ({ onCreateTrip, onMoreMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const leftItems  = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_LEFT  as readonly string[]).includes(i.id));
  const rightItems = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_RIGHT as readonly string[]).includes(i.id));

  const isActive = (path: string) => location.pathname === path;
  const moreActive = ['/risk-monitor', '/settings'].includes(location.pathname);

  return (
    <Box
      component="nav"
      aria-label="Mobile navigation"
      sx={{
        display: { xs: 'flex', lg: 'none' },
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
            : 'rgba(14,14,14,0.96)',
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
              color: active ? '#FF385C' : 'text.disabled',
              py: 1,
            }}
          >
            <item.Icon size={22} stroke={1.75} color={active ? '#FF385C' : 'currentColor'} />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: active ? 700 : 600, fontFamily: "'Inter',sans-serif" }}>
              {item.shortLabel}
            </Typography>
          </Box>
        );
      })}

      {/*  New Trip FAB — centre slot  */}
      <Box
        component="button"
        onClick={onCreateTrip}
        aria-label="Create new trip"
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
            background: 'linear-gradient(135deg,#FF385C,#D91A50)',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(255,56,92,0.45)',
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#FF385C', mt: 0.25, fontFamily: "'Inter',sans-serif" }}>
          New Trip
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
              color: active ? '#FF385C' : 'text.disabled',
              py: 1,
            }}
          >
            <item.Icon size={22} stroke={1.75} color={active ? '#FF385C' : 'currentColor'} />
            <Typography sx={{ fontSize: '0.62rem', fontWeight: active ? 700 : 600, fontFamily: "'Inter',sans-serif" }}>
              {item.shortLabel}
            </Typography>
          </Box>
        );
      })}

      <Box
        component="button"
        onClick={onMoreMenu}
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
          color: moreActive ? '#FF385C' : 'text.disabled',
          py: 1,
        }}
      >
        <MoreHorizRoundedIcon sx={{ fontSize: 22 }} />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: moreActive ? 700 : 600, fontFamily: "'Inter',sans-serif" }}>
          More
        </Typography>
      </Box>
    </Box>
  );
};

export default AppBottomNav;
