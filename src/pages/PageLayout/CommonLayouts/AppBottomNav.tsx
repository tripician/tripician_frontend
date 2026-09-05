import React from 'react';
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import { APP_NAV_ITEMS, DESKTOP_NAV_MIN_WIDTH, type AppNavItem } from '../navConfig';

/**
 * Items shown LEFT of the create button.
 *
 * Community then Stories: the two reading surfaces sit together, which is what
 * someone opening the app without a trip to plan is actually here for.
 */
const MOBILE_NAV_LEFT = ['explore', 'stories'] as const;
/**
 * Items shown RIGHT of the create button.
 *
 * Profile is here rather than in the More drawer because it now holds every one
 * of your trips. Leaving it behind a drawer would put your own trips two taps
 * deep on the surface where most planning actually happens.
 *
 * Navia used to sit at the head of this list and no longer does. See
 * MOBILE_NAV_EXCLUDED in navConfig for why, and for the guard that stops it
 * being read as an item somebody dropped by accident.
 */
const MOBILE_NAV_RIGHT = ['road', 'profile'] as const;

interface AppBottomNavProps {
  onCreateTrip: () => void;
}

/**
 * One tab.
 *
 * Was written out twice, byte for byte, once per side of the bar. Two copies of
 * a control is two places for its focus ring or its active colour to drift.
 */
const NavTab: React.FC<{ item: AppNavItem; active: boolean; onClick: () => void }> = ({
  item,
  active,
  onClick,
}) => (
  <Box
    component="button"
    onClick={onClick}
    aria-label={item.label}
    aria-current={active ? 'page' : undefined}
    sx={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.35,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      // Not text.disabled: an unselected destination is available, and disabled
      // grey reads as unavailable. It also sits at 2.39:1, which the contrast
      // guard already records as failing.
      color: active ? 'primary.main' : 'text.secondary',
      py: 1,
      transition: (t) => `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
      '&:focus-visible': { outline: (t) => `2px solid ${t.custom.ring}`, outlineOffset: -4 },
    }}
  >
    {/* The same brand-tinted pill the desktop nav draws behind an active item,
        so the two navs speak one language rather than two. Token colour, zero
        blur: a ring or a wash, never a glow. */}
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        width: 34,
        height: 26,
        borderRadius: '9px',
        bgcolor: (t) => (active ? t.custom.surface.brandTint : 'transparent'),
        transition: (t) =>
          `background-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
      }}
    >
      <item.Icon size={21} stroke={1.75} color="currentColor" />
    </Box>
    <Typography variant="navLabel" noWrap sx={{ fontWeight: active ? 700 : 600, maxWidth: '100%' }}>
      {item.shortLabel}
    </Typography>
  </Box>
);

const AppBottomNav: React.FC<AppBottomNavProps> = ({ onCreateTrip }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const leftItems = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_LEFT as readonly string[]).includes(i.id));
  const rightItems = APP_NAV_ITEMS.filter((i) => (MOBILE_NAV_RIGHT as readonly string[]).includes(i.id));

  const [createOpen, setCreateOpen] = React.useState(false);
  const createTileRef = React.useRef<HTMLDivElement | null>(null);

  /*
   * Prefix, not equality.
   *
   * An exact match meant /community/anything lit no tab at all, so following a
   * link out of a feed silently unselected the section you were still in.
   */
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  /*
   * Both creation routes behind one control.
   *
   * StoryCreationModal lives in AppShellHeader, not here, so the story item goes
   * through the window event that header already listens for rather than this
   * component mounting a second copy of the modal.
   */
  const createItems = [
    {
      key: 'trip',
      label: 'Plan a trip',
      Icon: MapRoundedIcon,
      run: onCreateTrip,
    },
    {
      key: 'story',
      label: 'Write a story',
      Icon: EditNoteRoundedIcon,
      run: () => window.dispatchEvent(new Event('story:create')),
    },
  ];

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
        // A hairline and the blur are the separation. The drop shadow that used
        // to sit here as well was a hardcoded literal doing the same job twice.
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {leftItems.map((item) => (
        <NavTab
          key={item.id}
          item={item}
          active={isActive(item.path)}
          onClick={() => navigate(item.path)}
        />
      ))}

      {/*  Create - centre slot  */}
      <Box
        component="button"
        onClick={() => setCreateOpen(true)}
        aria-label="Create"
        aria-haspopup="menu"
        aria-expanded={createOpen}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          mt: -2.5,
          '&:focus-visible': { outline: 'none' },
          '&:focus-visible > div': { outline: (t) => `2px solid ${t.custom.ring}`, outlineOffset: 2 },
        }}
      >
        <Box
          ref={createTileRef}
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
            transition: (t) => `transform ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="navLabel" noWrap sx={{ fontWeight: 700, color: 'primary.main', mt: 0.25 }}>
          Create
        </Typography>
      </Box>

      <Menu
        anchorEl={createTileRef.current}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { minWidth: 208, borderRadius: '14px', mb: 1 } } }}
      >
        {createItems.map(({ key, label, Icon, run }) => (
          <MenuItem
            key={key}
            onClick={() => {
              setCreateOpen(false);
              run();
            }}
            sx={{ py: 1.1 }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Icon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>
              {label}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {rightItems.map((item) => (
        <NavTab
          key={item.id}
          item={item}
          active={isActive(item.path)}
          onClick={() => navigate(item.path)}
        />
      ))}
    </Box>
  );
};

export default AppBottomNav;
