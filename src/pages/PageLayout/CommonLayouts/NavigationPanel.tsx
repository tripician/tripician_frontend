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
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';

import {
  Home as HomeIcon,
  People as CommunityIcon,
  Dashboard as DasboardIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
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
  { text: 'Community', icon: <CommunityIcon />, path: '/community' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const NavigationPannel: React.FC<Props> = ({ children, onMenuItemChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Home');
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
    if (currentItem) {
      setSelectedItem(currentItem.text);
      if (onMenuItemChange) {
        onMenuItemChange(currentItem.text);
      }
    } else if (currentPath === '/profile') {
      setSelectedItem('Profile');
      if (onMenuItemChange) {
        onMenuItemChange('Profile');
      }
    }
  }, [location.pathname, onMenuItemChange]);

  useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  const toggleDrawer = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuItemClick = (itemText: string) => {
    // Only navigate, don't update state here to prevent race conditions
    // Let the useEffect handle state updates based on route changes
    if (itemText === 'Profile') {
      navigate('/profile');
    } else {
      const menuItem = menuItems.find(item => item.text === itemText);
      if (menuItem) {
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
            background: theme.palette.mode === 'light' 
              ? 'linear-gradient(180deg, #132735ff 0%, #006097ff 100%)'
              : 'linear-gradient(180deg, #1a202c 0%, #2d3748 100%)',
            color: 'white',
            overflowX: 'hidden',
            boxShadow: theme.palette.mode === 'light' 
              ? '0 4px 20px rgba(102, 126, 234, 0.3)' 
              : '0 4px 20px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRight: `1px solid ${theme.palette.mode === 'light' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
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
              justifyContent: isCollapsed ? 'center' : 'space-between',
              mb: 2,
              minHeight: 64,
            }}
          >
            {!isCollapsed && (
              <div 
                className="common-logo"
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_URL}
                  alt="Tripician Logo"
                  style={{
                    maxHeight: '40px',
                    width: 'auto',
                    filter: 'brightness(1.1)',
                  }}
                />
              </div>
            )}
            {(isMobile || isCollapsed) && (
              <IconButton
                onClick={toggleDrawer}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    transform: 'scale(1.05)',
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          {/* Menu Items */}
          <List sx={{ px: 0 }}>
            {menuItems.map((item) => (
              <Tooltip
                key={item.text}
                title={isCollapsed ? item.text : ''}
                placement="right"
                arrow
              >
                <ListItem
                  component="button"
                  onClick={() => handleMenuItemClick(item.text)}
                  sx={{
                    borderRadius: 1,
                    px: isCollapsed ? 1 : 2,
                    py: 1.5,
                    mb: 1,
                    minHeight: 48,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    backgroundColor: selectedItem === item.text ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedItem === item.text
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(255,255,255,0.15)',
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
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: '0 2px 2px 0',
                    } : {},
                  }}
                >
                  <Box
                    sx={{
                      color: selectedItem === item.text ? '#fff' : 'rgba(255,255,255,0.8)',
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
                        color: selectedItem === item.text ? '#fff' : 'rgba(255,255,255,0.8)',
                        fontWeight: selectedItem === item.text ? 600 : 400,
                        '& .MuiListItemText-primary': {
                          fontSize: '0.95rem',
                        },
                      }}
                    />
                  )}
                </ListItem>
              </Tooltip>
            ))}
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
              border: '1px solid rgba(255,255,255,0.3)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.18)',
                transform: 'translateX(4px)',
                borderColor: 'rgba(255,255,255,0.4)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box
              sx={{
                color: '#fff',
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
                  color: '#fff',
                  fontWeight: 600,
                  '& .MuiListItemText-primary': {
                    fontSize: '0.95rem',
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
