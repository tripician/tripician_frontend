import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import Footer from './Footer';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { fetchUserProfile } from '../../../store/userSlice';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal';
import SupportWidget from '../../../components/CommonComponents/SupportWidget';
import OnboardingCarousel from '../../../components/Onboarding/OnboardingCarousel';
import AppShellHeader from './AppShellHeader';
import AppBottomNav from './AppBottomNav';
import { AppShellProvider, type CreateTripPrefill } from '../AppShellContext';
import { APP_NAV_ITEMS } from '../navConfig';

interface Props {
  children: React.ReactNode;
}

/*
 * Everything that is not in the bottom bar.
 *
 * `profile` was in neither: not the bottom nav, not this sheet, and not the
 * account popover - so below the lg breakpoint the profile page was reachable
 * only by typing the URL. A page you cannot navigate to is not a page.
 */
const MORE_NAV_IDS = ['risk', 'profile'];

const NavigationPannel: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [createTripPrefill, setCreateTripPrefill] = useState<CreateTripPrefill | undefined>(undefined);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const plannerMatch = useMatch('/tripplanner/:tripId');
  const activeTripId = plannerMatch?.params.tripId;
  // The planner has its own dense UI; everywhere else the support widget floats quietly.
  const hideSupportWidget = useMemo(
    () => Boolean(activeTripId) || location.pathname.startsWith('/tripplanner/'),
    [activeTripId, location.pathname],
  );

  const openCreateTrip = (prefill?: CreateTripPrefill) => {
    setCreateTripPrefill(prefill);
    setCreateTripOpen(true);
  };
  const closeCreateTrip = () => {
    setCreateTripOpen(false);
    // Cleared on close so the next plain "Plan a trip" does not inherit whatever
    // the last caller happened to know.
    setCreateTripPrefill(undefined);
  };

  /*
   * Revalidate against the server once per mount rather than only when the
   * profile is missing. `if (!profile)` meant a cached profile was never
   * re-checked, so a wrong one could not correct itself - not even on a hard
   * refresh, since the store rehydrates from that same cache on boot. That is
   * why the stale-identity bug looked unfixable from the user's side.
   */
  useEffect(() => {
    dispatch(fetchUserProfile({ force: true }));
  }, [dispatch]);

  useEffect(() => {
    const handler = (e: Event) => openCreateTrip((e as CustomEvent<CreateTripPrefill | undefined>).detail);
    window.addEventListener('trip:create', handler);
    return () => window.removeEventListener('trip:create', handler);
  }, []);

  return (
    <AppShellProvider value={{ openCreateTrip }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '100vw', overflow: 'hidden' }}>
        <AppShellHeader onCreateTrip={openCreateTrip} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            pb: { xs: 10, lg: 0 },
          }}
        >
          <Box sx={{ flexGrow: 1 }}>{children}</Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Footer />
          </Box>
        </Box>

        <AppBottomNav onCreateTrip={openCreateTrip} onMoreMenu={() => setMoreMenuOpen(true)} />

        <Drawer
          anchor="bottom"
          open={moreMenuOpen}
          onClose={() => setMoreMenuOpen(false)}
          sx={{ display: { xs: 'block', lg: 'none' } }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              pb: 'env(safe-area-inset-bottom, 8px)',
            },
          }}
        >
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 2 }} />
            <List disablePadding>
              {APP_NAV_ITEMS.filter((i) => MORE_NAV_IDS.includes(i.id)).map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setMoreMenuOpen(false);
                  }}
                  selected={location.pathname === item.path}
                  sx={{ borderRadius: '12px', mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? '#FF385C' : 'inherit' }}>
                    <item.Icon />
                  </ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* The app's single create dialog. Pages call openCreateTrip rather than
            mounting their own copy. */}
        <TripCreationModal open={createTripOpen} onClose={closeCreateTrip} initial={createTripPrefill} />
        {!hideSupportWidget && <SupportWidget />}
        {!hideSupportWidget && <OnboardingCarousel />}
      </Box>
    </AppShellProvider>
  );
};

export default NavigationPannel;
