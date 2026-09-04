import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useMatch } from 'react-router-dom';
import Footer from './Footer';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { fetchUserProfile } from '../../../store/userSlice';
import { Box } from '@mui/material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal';
import SupportWidget from '../../../components/CommonComponents/SupportWidget';
import OnboardingCarousel from '../../../components/Onboarding/OnboardingCarousel';
import AppShellHeader from './AppShellHeader';
import AppBottomNav from './AppBottomNav';
import { AppShellProvider, type CreateTripPrefill } from '../AppShellContext';
import ProDialog from '../../../pricing/ProDialog';
import NaviaCommandBar from '../../../navia/commandbar/NaviaCommandBar';
import {
  COMMAND_BAR_STATE_EVENT,
  onCommandBarRoute,
  type CommandBarState,
} from '../../../navia/commandbar/commandModes';

interface Props {
  children: React.ReactNode;
}

/*
 * The More drawer is gone.
 *
 * It only ever held one item at a time - Risk, then Crew - and each of those
 * turned out to belong somewhere with more context: Risk in the account menu,
 * Crew as the Travellers segment on Browse. With the drawer empty, "More" was a
 * button that opened nothing, so the slot went to From the road instead. Every
 * nav item is now one tap on every breakpoint.
 */

const NavigationPannel: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [createTripPrefill, setCreateTripPrefill] = useState<CreateTripPrefill | undefined>(undefined);

  const plannerMatch = useMatch('/tripplanner/:tripId');
  const activeTripId = plannerMatch?.params.tripId;
  // The planner has its own dense UI; everywhere else the support widget floats quietly.
  const hideSupportWidget = useMemo(
    () => Boolean(activeTripId) || location.pathname.startsWith('/tripplanner/'),
    [activeTripId, location.pathname],
  );

  // The command bar sits where the support FAB does below lg, so the FAB steps up
  // while it is collapsed and gets out of the way entirely once it opens.
  //
  // Presence is derived from the route rather than taken from the event: a child's
  // effects run before its parent's, so a mount-time dispatch lands before this
  // listener exists. Only opening and closing, which are user actions, come over
  // the wire.
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setCommandBarOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener(COMMAND_BAR_STATE_EVENT, handler);
    return () => window.removeEventListener(COMMAND_BAR_STATE_EVENT, handler);
  }, []);

  const commandBarState: CommandBarState = useMemo(() => {
    if (!onCommandBarRoute(location.pathname)) return 'none';
    return commandBarOpen ? 'expanded' : 'collapsed';
  }, [location.pathname, commandBarOpen]);

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

  // The plan popup, raised from the top bar and from anywhere a limit is hit.
  const [proOpen, setProOpen] = useState(false);
  const openProDialog = () => setProOpen(true);

  useEffect(() => {
    const handler = () => setProOpen(true);
    window.addEventListener('plan:open', handler);
    return () => window.removeEventListener('plan:open', handler);
  }, []);

  return (
    <AppShellProvider value={{ openCreateTrip, openProDialog }}>
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

        <AppBottomNav onCreateTrip={openCreateTrip} />

        {/* The app's single create dialog. Pages call openCreateTrip rather than
            mounting their own copy. */}
        <TripCreationModal open={createTripOpen} onClose={closeCreateTrip} initial={createTripPrefill} />
        <ProDialog open={proOpen} onClose={() => setProOpen(false)} />
        {!hideSupportWidget && <NaviaCommandBar />}
        {!hideSupportWidget && <SupportWidget commandBar={commandBarState} />}
        {!hideSupportWidget && <OnboardingCarousel />}
      </Box>
    </AppShellProvider>
  );
};

export default NavigationPannel;
