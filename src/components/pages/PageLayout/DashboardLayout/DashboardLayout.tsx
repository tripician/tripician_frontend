import React, { useState, useEffect } from 'react';
import Footer from "../../PageLayout/Common/Footer";
import {
  Box,
  Drawer,
  List,
  ListItemText,
  Button,
  ListItem,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as CommunityIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
  onMenuItemChange?: (itemName: string) => void;
}

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Community', icon: <CommunityIcon /> },
  { text: 'Profile', icon: <ProfileIcon /> },
  { text: 'Settings', icon: <SettingsIcon /> },
];

const DashboardLayout: React.FC<Props> = ({ children, onMenuItemChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Dashboard');

  useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  const toggleDrawer = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuItemClick = (itemText: string) => {
    setSelectedItem(itemText);
    if (onMenuItemChange) {
      onMenuItemChange(itemText);
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
            background: 'linear-gradient(180deg, #002837ff 0%, #66a6ff 100%)',
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
              <div className="signin-logo">
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

        {/* Create Trip Button */}
        {isCollapsed ? (
          <Tooltip title="Create trip" placement="right" arrow>
            <IconButton
              sx={{
                backgroundColor: 'white',
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                },
                mb: 1,
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              mt: 2,
              backgroundColor: 'white',
              color: '#1976d2',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#f0f0f0',
              },
            }}
          >
            Create trip
          </Button>
        )}
      </Drawer>

      {/* Right Side: Main Content + Footer */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: '#f5f5f5',
            pl: 4,
            pr: 4,
            pt: 2,
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          {children}
        </Box>

        {/* Footer */}
        <Footer />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
