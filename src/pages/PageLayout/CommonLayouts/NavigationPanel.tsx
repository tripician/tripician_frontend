import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from "./Footer";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../../store";
import { fetchUserProfile } from "../../../store/userSlice";

import {
  Box,
  Drawer,
  List,
  ListItemText,
  ListItem,
  useTheme,
  Tooltip
} from '@mui/material';

import {
  Home as HomeIcon,
  People as CommunityIcon,
  Dashboard as DasboardIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal';
import ChatAssistant from '../../../components/CommonComponents/ChatAssistant';

interface Props {
  children: React.ReactNode;
  onMenuItemChange?: (itemName: string) => void;
}

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const menuItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/home' },
  { text: 'Dashboard', icon: <DasboardIcon />, path: '/dashboard' },
  { text: 'Community', icon: <CommunityIcon />, path: '/community', disabled: true, comingSoon: true },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const NavigationPannel: React.FC<Props> = ({ children, onMenuItemChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  // Sidebar is always collapsed (icons only)
  const isCollapsed = true;
  // Initialize selected item from current route to avoid initial flicker defaulting to Home
  const [selectedItem, setSelectedItem] = useState(() => {
    const currentPath = location.pathname;
    const match = menuItems.find(item => item.path === currentPath);
    if (match) return match.text;
    if (currentPath === '/profile') return 'Profile';
    return 'Home';
  });
  const [createTripOpen, setCreateTripOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  // ✅ Get user profile from Redux store
  const { profile } = useSelector((state: RootState) => state.user);

  // Fetch profile once when component mounts
  useEffect(() => {
    if (!profile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, profile]);

  // profile button removed; profile access via TopBar avatar. (profilename no longer needed)

  // Update selected item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = menuItems.find(item => item.path === currentPath);
    let newSelection: string | null = null;
    if (currentItem) {
      newSelection = currentItem.text;
    } else if (currentPath === '/profile') {
      newSelection = 'Profile';
    }
    if (newSelection && newSelection !== selectedItem) {
      setSelectedItem(newSelection);
      onMenuItemChange?.(newSelection);
    }
  }, [location.pathname, onMenuItemChange, selectedItem]);

  const handleMenuItemClick = (itemText: string) => {
    // Only navigate, don't update state here to prevent race conditions
    // Let the useEffect handle state updates based on route changes
    if (itemText === 'Profile') {
      navigate('/profile');
    } else {
      const menuItem = menuItems.find(item => item.text === itemText);
      if (menuItem) {
        if((menuItem as any).disabled) return; // block navigation
        navigate(menuItem.path);
      }
    }
  };

  const currentDrawerWidth = isCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', height: '100vh', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: currentDrawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: currentDrawerWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: isCollapsed ? 1 : 2,
            background: theme.palette.mode === 'light' ? '#FFFFFF' : '#141414',
            color: theme.palette.mode === 'light' ? '#222222' : '#E5E5E5',
            overflowX: 'hidden',
            boxShadow: theme.palette.mode === 'light'
              ? '2px 0 20px rgba(0, 0, 0, 0.06)'
              : '2px 0 20px rgba(0, 0, 0, 0.5)',
            borderRight: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'}`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {/* Sidebar Header */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              px: 0,
              py: 1,
              minHeight: 50,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: isCollapsed ? 0.5 : 1.25
              }}
            >
              <Box
                component="img"
                src={isCollapsed ? import.meta.env.VITE_TRIPICIAN_LOGO_ICON_URL : import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_URL}
                alt="Tripician"
                sx={{
                  height: isCollapsed ? 40 : 45,
                  width: 'auto',
                  display: 'block',
                  maxWidth: '100%',
                  filter: theme.palette.mode === 'light'
                    ? 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.18))'
                    : 'drop-shadow(0px 6px 14px rgba(0, 0, 0, 0.6))'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: isCollapsed ? -6 : -12,
                  right: isCollapsed ? -8 : -16,
                  px: 0.75,
                  py: 0.15,
                  fontSize: isCollapsed ? '0.58rem' : '0.62rem',
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  borderRadius: 999,
                  backgroundColor: '#FF385C',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(255, 56, 92, 0.35)'
                }}
              >
                BETA
              </Box>
            </Box>
          </Box>

          {/* Menu Items */}

          <List sx={{ px: 0, py: 5 }}>
            {menuItems.map(item => {
              const disabled = (item as any).disabled;
              const comingSoon = (item as any).comingSoon;
              return (
                <Tooltip
                  key={item.text}
                  title={isCollapsed ? (comingSoon ? `${item.text} (Coming Soon)` : item.text) : (comingSoon ? 'Coming Soon' : '')}
                  placement="right"
                  arrow
                >
                  <ListItem
                    component="button"
                    disabled={disabled}
                    onClick={() => handleMenuItemClick(item.text)}
                    sx={{
                      borderRadius: 1,
                      px: isCollapsed ? 1 : 2,
                      py: 1.5,
                      mb: 1,
                      minHeight: 48,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      backgroundColor: selectedItem === item.text
                        ? (theme.palette.mode === 'light' ? 'rgba(255, 56, 92, 0.08)' : 'rgba(255, 56, 92, 0.18)')
                        : 'transparent',
                      '&:hover': disabled ? {} : {
                        backgroundColor: selectedItem === item.text
                          ? (theme.palette.mode === 'light' ? 'rgba(255, 56, 92, 0.12)' : 'rgba(255, 56, 92, 0.24)')
                          : (theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)'),
                        transform: 'translateX(4px)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      '&::before': selectedItem === item.text ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '4px',
                        height: '60%',
                        backgroundColor: '#FF385C',
                        borderRadius: '0 2px 2px 0',
                      } : {},
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Box
                      sx={{
                        color: selectedItem === item.text
                          ? '#FF385C'
                          : (theme.palette.mode === 'light' ? '#717171' : 'rgba(255,255,255,0.6)'),
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 24,
                        mr: isCollapsed ? 0 : 2,
                      }}
                    >
                      {item.icon}
                    </Box>
                    {!isCollapsed && (
                      <ListItemText
                        primary={item.text}
                        sx={{
                          color: selectedItem === item.text
                            ? '#FF385C'
                            : (theme.palette.mode === 'light' ? '#333333' : 'rgba(255,255,255,0.8)'),
                          fontWeight: selectedItem === item.text ? 700 : 400,
                          '& .MuiListItemText-primary': { fontSize: '0.9rem', fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' },
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      />
                    )}
                    {!isCollapsed && comingSoon && (
                      <Box sx={{ ml: 'auto', fontSize: 10, px: .7, py: .2, bgcolor: theme.palette.mode === 'light' ? 'rgba(255,56,92,0.1)' : 'rgba(255,255,255,0.18)', color: theme.palette.mode === 'light' ? '#FF385C' : '#fff', borderRadius: 1, fontWeight: 700, letterSpacing: .5 }}>SOON</Box>
                    )}
                  </ListItem>
                </Tooltip>
              );
            })}
          </List>
        </Box>

        {/* Create Trip Button now placed at end */}
        <Tooltip
          key="CreateTrip"
          title={isCollapsed ? 'Create Trip' : ''}
          placement="right"
          arrow
        >
          <ListItem
            component="button"
            onClick={() => setCreateTripOpen(true)}
            sx={{
              borderRadius: 1,
              px: isCollapsed ? 1 : 2,
              py: 1.5,
              mb: 1,
              minHeight: 48,
              border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(255,56,92,0.45)' : 'rgba(255,255,255,0.3)'}`,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,56,92,0.06)' : 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,56,92,0.12)' : 'rgba(255,255,255,0.18)',
                transform: 'translateX(4px)',
                borderColor: theme.palette.mode === 'light' ? '#FF385C' : 'rgba(255,255,255,0.4)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box
              sx={{
                color: theme.palette.mode === 'light' ? '#FF385C' : '#fff',
                display: 'flex',
                alignItems: 'center',
                minWidth: 24,
                mr: isCollapsed ? 0 : 2,
              }}
            >
              <AddIcon />
            </Box>
            {!isCollapsed && (
              <ListItemText
                primary={'Create Trip'}
                sx={{
                  color: theme.palette.mode === 'light' ? '#FF385C' : '#fff',
                  fontWeight: 700,
                  '& .MuiListItemText-primary': {
                    fontSize: '0.9rem',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '0.01em',
                  },
                }}
              />
            )}
          </ListItem>
        </Tooltip>
      </Drawer>

      {/* Right Side: Main Content + Footer */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: `calc(100vw - ${currentDrawerWidth}px)`, height: '100vh', overflow: 'visible', position: 'relative' }}>
        {/* Main Content Area with Footer inside scrollable area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          {/* Content Container */}
          <Box
            sx={{
              flexGrow: 1,
              pl: 0,
              pr: 0,
              pt: 0,
              pb: 2,
            }}
          >
            {children}
          </Box>

          {/* Footer - now inside scrollable area */}
          <Footer />
        </Box>
        <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
        <ChatAssistant />
      </Box>
    </Box>
  );
};

export default NavigationPannel;
