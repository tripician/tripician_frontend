import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from './Footer';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { fetchUserProfile } from '../../../store/userSlice';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal';
import ChatAssistant from '../../../components/CommonComponents/ChatAssistant';
import AppShellHeader from './AppShellHeader';
import AppBottomNav from './AppBottomNav';
import { AppShellProvider } from '../AppShellContext';
import { APP_NAV_ITEMS } from '../navConfig';

interface Props {
  children: React.ReactNode;
}

const MORE_NAV_IDS = ['risk', 'settings'];

const NavigationPannel: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { profile } = useSelector((state: RootState) => state.user);

  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const openCreateTrip = () => setCreateTripOpen(true);

  useEffect(() => {
    if (!profile) dispatch(fetchUserProfile());
  }, [dispatch, profile]);

  useEffect(() => {
    const handler = () => openCreateTrip();
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
          <Footer />
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

        <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
        <ChatAssistant />
      </Box>
    </AppShellProvider>
  );
};

export default NavigationPannel;
