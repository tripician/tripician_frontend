import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from "./Footer";
import {
  Box,
  Drawer,
  List,
  ListItemText,
  ListItem,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  People as CommunityIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
  onMenuItemChange?: (itemName: string) => void;
}

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const profileItem = { text: 'Profile', icon: <ProfileIcon />, path: '/profile' };
const menuItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/home' },
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
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
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
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
            background: 'linear-gradient(180deg, #00222eff 0%, #0081b0ff 100%)',
            color: 'white',
            overflowX: 'hidden',
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
              <div className="common-logo">
                <img
                  src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_URL}
                  alt="Tripician Logo"
                />
              </div>
            )}
            {(isMobile || isCollapsed) && (
              <IconButton
                onClick={toggleDrawer}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
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
                    backgroundColor: selectedItem === item.text ? 'rgba(255,255,255,0.15)' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedItem === item.text
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
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

        {/* Profile Button */}
        <Tooltip
          key={profileItem.text}
          title={isCollapsed ? profileItem.text : ''}
          placement="right"
          arrow
        >
          <ListItem
            component="button"
            onClick={() => handleMenuItemClick(profileItem.text)}
            sx={{
              borderRadius: 1,
              px: isCollapsed ? 1 : 2,
              py: 1.5,
              mb: 1,
              minHeight: 48,
              border: '1px solid rgba(255,255,255,0.2)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              backgroundColor: selectedItem === profileItem.text ? 'rgba(255,255,255,0.15)' : 'transparent',
              '&:hover': {
                backgroundColor: selectedItem === profileItem.text
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(255,255,255,0.1)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Box
              sx={{
                color: selectedItem === profileItem.text ? '#fff' : 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                minWidth: 24,
                mr: isCollapsed ? 0 : 2,
              }}
            >
              <Avatar
                src={import.meta.env.VITE_NO_PROFILE_PIC_URL}
                sx={{ width: 36, height: 36, cursor: "pointer" }}
              />
            </Box>
            {!isCollapsed && (
              <ListItemText
                primary={profileItem.text}
                sx={{
                  color: selectedItem === profileItem.text ? '#fff' : 'rgba(255,255,255,0.8)',
                  fontWeight: selectedItem === profileItem.text ? 600 : 400,
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
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
        {/* Main Content Area with Footer inside scrollable area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: '#f5f5f5',
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
              pl: 4,
              pr: 4,
              pt: 2,
              pb: 2, // Add bottom padding
            }}
          >
            {children}
          </Box>

          {/* Footer - now inside scrollable area */}
          <Footer />
        </Box>
      </Box>
    </Box>
  );
};

export default NavigationPannel;
