import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from "./Footer";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../../store";
import { fetchUserProfile } from "../../../store/userSlice";

import {
  Box,
  Drawer,
  List,
  ListItem,
  useTheme,
  Tooltip
} from '@mui/material';

import {
  Home as HomeIcon,
  People as CommunityIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Security as RiskMonitorIcon
} from '@mui/icons-material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal';
import ChatAssistant from '../../../components/CommonComponents/ChatAssistant';

interface Props {
  children: React.ReactNode;
  onMenuItemChange?: (itemName: string) => void;
}

interface NavItem {
  text: string;
  Icon: React.ElementType;
  path: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const DRAWER_WIDTH = 72;

const NAV_ITEMS: NavItem[] = [
  { text: 'Home',      Icon: HomeIcon,       path: '/home'      },
  { text: 'Dashboard',     Icon: DashboardIcon,    path: '/dashboard' },
  { text: 'Risk Monitor',   Icon: RiskMonitorIcon,  path: '/risk-monitor' },  
  { text: 'Community',     Icon: CommunityIcon,    path: '/community', disabled: true, comingSoon: true },
  { text: 'Settings',  Icon: SettingsIcon,   path: '/settings'  },
];

const NavigationPannel: React.FC<Props> = ({ children, onMenuItemChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isLight = theme.palette.mode === 'light';

  const [selectedItem, setSelectedItem] = useState<string>(() => {
    const match = NAV_ITEMS.find(item => item.path === location.pathname);
    return match?.text ?? (location.pathname === '/profile' ? 'Profile' : 'Home');
  });
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for burger button event from TopBar
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev);
    window.addEventListener('nav:toggleMobile', handler);
    return () => window.removeEventListener('nav:toggleMobile', handler);
  }, []);

  const dispatch = useDispatch<AppDispatch>();
  const { profile } = useSelector((state: RootState) => state.user);

  // ── GSAP refs ────────────────────────────────────────────────────────────────
  const navItemRefs = useRef<(HTMLElement | null)[]>([]);
  const createBtnRef = useRef<HTMLDivElement>(null);
  const iconRefs     = useRef<Record<string, HTMLElement | null>>({});

  // Mount animation — items stagger in, create button bounces in last
  useEffect(() => {
    const items = navItemRefs.current.filter(Boolean);
    const tl = gsap.timeline();
    tl.fromTo(
      items,
      { y: 16, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.09, duration: 0.44, ease: 'back.out(1.7)', delay: 0.12 }
    );
    if (createBtnRef.current) {
      tl.fromTo(
        createBtnRef.current,
        { y: 20, opacity: 0, scale: 0.72 },
        { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(2.2)' },
        '-=0.05'
      );
    }
    return () => { tl.kill(); };
  }, []);

  // Active icon pop when selection changes
  useEffect(() => {
    const el = iconRefs.current[selectedItem];
    if (el) gsap.fromTo(el, { scale: 0.68 }, { scale: 1, duration: 0.36, ease: 'back.out(2.6)' });
  }, [selectedItem]);

  useEffect(() => {
    if (!profile) dispatch(fetchUserProfile());
  }, [dispatch, profile]);

  useEffect(() => {
    const match = NAV_ITEMS.find(item => item.path === location.pathname);
    const newSel = match?.text ?? (location.pathname === '/profile' ? 'Profile' : null);
    if (newSel && newSel !== selectedItem) {
      setSelectedItem(newSel);
      onMenuItemChange?.(newSel);
    }
  }, [location.pathname, onMenuItemChange, selectedItem]);

  const handleMenuItemClick = (itemText: string) => {
    if (itemText === 'Profile') { navigate('/profile'); return; }
    const item = NAV_ITEMS.find(i => i.text === itemText);
    if (item && !item.disabled) navigate(item.path);
  };

  // GSAP icon hover helpers
  const handleIconEnter = (text: string) => {
    const el = iconRefs.current[text];
    if (el) gsap.to(el, { scale: 1.28, duration: 0.2, ease: 'back.out(2)' });
  };
  const handleIconLeave = (text: string) => {
    const el = iconRefs.current[text];
    if (el) gsap.to(el, { scale: 1, duration: 0.18, ease: 'power2.out' });
  };

  // GSAP Create-Trip + rotate
  const handleCreateEnter = () => {
    const svg = createBtnRef.current?.querySelector('svg');
    if (svg) gsap.to(svg, { rotate: 90, duration: 0.28, ease: 'back.out(1.5)' });
  };
  const handleCreateLeave = () => {
    const svg = createBtnRef.current?.querySelector('svg');
    if (svg) gsap.to(svg, { rotate: 0, duration: 0.22, ease: 'power2.out' });
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', maxWidth: '100vw', overflow: 'hidden' }}>

      {/* ── Sidebar — desktop only ─────────────────────────────────────────── */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(14,14,14,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: 'none',
            boxShadow: isLight
              ? '4px 0 32px rgba(0,0,0,0.07)'
              : '4px 0 32px rgba(0,0,0,0.6)',
            overflowX: 'hidden',
            // Gradient brand line on the right edge
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 0,
              top: '15%',
              bottom: '15%',
              width: '1px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,56,92,0.4) 50%, transparent 100%)',
            },
          },
        }}
      >
        {/* Top spacer — vertically centers the nav list */}
        <Box sx={{ flex: 1 }} />

        {/* ── Nav items ───────────────────────────────────────────────────── */}
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '6px', px: 1 }}>
          {NAV_ITEMS.map((item, idx) => {
            const active = selectedItem === item.text;
            return (
              <Tooltip
                key={item.text}
                title={item.comingSoon ? `${item.text} (Coming Soon)` : item.text}
                placement="right"
                arrow
              >
                <ListItem
                  component="button"
                  disabled={item.disabled}
                  ref={(el: any) => { navItemRefs.current[idx] = el; }}
                  onClick={() => handleMenuItemClick(item.text)}
                  onMouseEnter={() => !item.disabled && handleIconEnter(item.text)}
                  onMouseLeave={() => !item.disabled && handleIconLeave(item.text)}
                  sx={{
                    width: 48, height: 48, position: 'relative',
                    borderRadius: '14px',
                    p: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: active
                      ? (isLight
                        ? 'linear-gradient(135deg,rgba(255,56,92,0.11) 0%,rgba(217,26,80,0.07) 100%)'
                        : 'linear-gradient(135deg,rgba(255,56,92,0.26) 0%,rgba(217,26,80,0.17) 100%)')
                      : 'transparent',
                    border: `1px solid ${active
                      ? `rgba(255,56,92,${isLight ? '0.24' : '0.38'})`
                      : 'transparent'}`,
                    boxShadow: active ? '0 2px 16px rgba(255,56,92,0.2)' : 'none',
                    opacity: item.disabled ? 0.36 : 1,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                    '&:hover': item.disabled ? {} : {
                      background: active
                        ? undefined
                        : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.07)'),
                    },
                  }}
                >
                  <Box
                    ref={(el: any) => { iconRefs.current[item.text] = el; }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: active ? '#FF385C' : (isLight ? '#BEBEBE' : 'rgba(255,255,255,0.35)'),
                      filter: active ? 'drop-shadow(0 2px 8px rgba(255,56,92,0.55))' : 'none',
                      transition: 'color 0.22s ease, filter 0.22s ease',
                    }}
                  >
                    <item.Icon sx={{ fontSize: 22 }} />
                  </Box>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>

        {/* Bottom spacer */}
        <Box sx={{ flex: 1 }} />

        {/* ── Create Trip button ───────────────────────────────────────────── */}
        <Box ref={createBtnRef} sx={{ mb: 1.5 }}>
          <Tooltip title="Create Trip" placement="right" arrow>
            <Box
              component="button"
              onClick={() => setCreateTripOpen(true)}
              onMouseEnter={handleCreateEnter}
              onMouseLeave={handleCreateLeave}
              sx={{
                width: 44, height: 44,
                borderRadius: '14px',
                background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 22px rgba(255,56,92,0.42)',
                transition: 'box-shadow 0.22s ease, transform 0.15s ease',
                '&:hover': { boxShadow: '0 6px 30px rgba(255,56,92,0.65)' },
                '&:active': { transform: 'scale(0.94)' },
              }}
            >
              <AddIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
          </Tooltip>
        </Box>
      </Drawer>

      {/* ── Mobile drawer — slides in from left on xs/sm ──────────────────── */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 220,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 3,
            gap: 0,
            background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(14,14,14,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: 'none',
            boxShadow: isLight ? '4px 0 32px rgba(0,0,0,0.10)' : '4px 0 32px rgba(0,0,0,0.6)',
          },
        }}
      >
        {/* Nav items */}
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '4px', px: 1.5, width: '100%' }}>
          {NAV_ITEMS.map(item => {
            const active = selectedItem === item.text;
            return (
              <ListItem
                key={item.text}
                component="button"
                disabled={item.disabled}
                onClick={() => { if (!item.disabled) { handleMenuItemClick(item.text); setMobileOpen(false); } }}
                sx={{
                  width: '100%', height: 48, borderRadius: '12px', px: 2, gap: 1.5,
                  justifyContent: 'flex-start', alignItems: 'center',
                  background: active
                    ? (isLight ? 'linear-gradient(135deg,rgba(255,56,92,0.10),rgba(217,26,80,0.06))' : 'linear-gradient(135deg,rgba(255,56,92,0.22),rgba(217,26,80,0.14))')
                    : 'transparent',
                  border: `1px solid ${active ? `rgba(255,56,92,${isLight ? '0.22' : '0.35'})` : 'transparent'}`,
                  opacity: item.disabled ? 0.36 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  '&:hover': item.disabled ? {} : { background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' },
                }}
              >
                <Box sx={{ color: active ? '#FF385C' : (isLight ? '#999' : 'rgba(255,255,255,0.38)'), display: 'flex', alignItems: 'center' }}>
                  <item.Icon sx={{ fontSize: 20 }} />
                </Box>
                <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? '#FF385C' : 'text.primary', fontFamily: "'Inter',sans-serif", letterSpacing: '-0.01em' }}>
                  {item.text}{item.comingSoon ? ' → Soon' : ''}
                </Box>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ flex: 1 }} />

        {/* Create Trip button */}
        <Box sx={{ px: 1.5, width: '100%', pb: 1 }}>
          <Box
            component="button"
            onClick={() => { setCreateTripOpen(true); setMobileOpen(false); }}
            sx={{
              width: '100%', height: 46, borderRadius: '12px',
              background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              color: '#fff', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.875rem',
              boxShadow: '0 4px 22px rgba(255,56,92,0.40)',
              transition: 'box-shadow 0.2s ease',
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
            Create Trip
          </Box>
        </Box>
      </Drawer>

      <Box sx={{
        display: 'flex', flexDirection: 'column', flexGrow: 1,
        width: { xs: '100vw', md: `calc(100vw - ${DRAWER_WIDTH}px)` }, height: '100vh',
        overflow: 'visible', position: 'relative',
      }}>
        <Box component="main" sx={{
          flexGrow: 1, overflowY: 'auto',
          backgroundColor: 'background.default',
          display: 'flex', flexDirection: 'column',
        }}>
          <Box sx={{ flexGrow: 1, p: 0, pb: 2 }}>{children}</Box>
          <Footer />
        </Box>
        <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
        <ChatAssistant />
      </Box>

    </Box>
  );
};

export default NavigationPannel;

