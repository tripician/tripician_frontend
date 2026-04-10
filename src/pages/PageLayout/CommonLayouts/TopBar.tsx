import React from "react";
import { Box, Typography, IconButton, Avatar, Tooltip, Popover, Divider, List, ListItemButton, ListItemText, ListItemIcon, Button, Badge } from "@mui/material";
import { styled } from '@mui/material/styles';
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShieldIcon from '@mui/icons-material/PrivacyTip';
import GavelIcon from '@mui/icons-material/Gavel';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SearchBar from "../../../components/CommonComponents/SearchBar";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { clearUser } from '../../../store/userSlice';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  showSearch?: boolean;
  logo?: React.ReactNode; // custom logo element (left area when no search)
  centerNode?: React.ReactNode; // absolutely centered content (e.g., trip title + status)
}

const TopBar: React.FC<TopBarProps> = ({ showSearch = true, logo, centerNode }) => {
  const { profile } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);
  const id = open ? 'profile-popover' : undefined;

  const handleAvatarClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    try {
      // Remove stored tokens (adjust keys as needed)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Clear redux user state
      dispatch(clearUser());
      handleClose();
      navigate('/signin');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const LogoutButton = styled(Button)(({ theme }) => ({
    position: 'absolute',
    bottom: 16,
    padding: '6px 16px',
    zIndex: 3,
    backgroundColor: '#FF385C',
    color: '#fff',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: '50px',
    boxShadow: '0 4px 14px rgba(255, 56, 92, 0.35)',
    '&:hover': {
      backgroundColor: '#E31C5F',
      boxShadow: '0 8px 24px rgba(255, 56, 92, 0.50)',
    },
  }));

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: 64,
          position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: showSearch ? 1.25 : 1,
          py: 1.2,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          positionRelative: 'relative'
        }}
      >        
        {centerNode && (
          <Box sx={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%, -50%)', display:'flex', alignItems:'center', gap:1 }}>
            {/* pointerEvents previously disabled, preventing editing of trip title */}
            {centerNode}
          </Box>
        )}

        {/* Center Section - Search or Logo */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            // Remove internal horizontal padding when showing logo to shift it left
            px: showSearch ? { xs: 1, md: 3 } : 0,
          }}
        >
          {showSearch ? (
            <Box sx={{ maxWidth: '500px', width: '100%' }}>
              <SearchBar />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {logo}
            </Box>
          )}
        </Box>

        {/* Right Section - Actions */}
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: { xs: 1, md: 2 },
            minWidth: { xs: "140px", md: "220px" },
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <Tooltip title="Notifications" arrow>
            <IconButton
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 56, 92, 0.08)',
                  transform: 'scale(1.08)',
                }
              }}
            >
              <Badge
                variant="dot"
                sx={{
                  '& .MuiBadge-dot': {
                    backgroundColor: '#FF385C',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: '2px solid white',
                    top: 2,
                    right: 2,
                  }
                }}
              >
                <NotificationsNoneIcon sx={{ color: "text.secondary", fontSize: 22 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          {/* Profile Avatar + Name */}
          <Tooltip title="Account" arrow>
            <Box
              aria-describedby={id}
              onClick={handleAvatarClick}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                lineHeight: 0,
                '&:hover': { transform: 'scale(1.06)' },
                transition: 'transform .2s ease'
              }}
            >
              <Avatar
                src={profile?.profilepicture || import.meta.env.VITE_NO_PROFILE_PIC_URL}
                alt={profile ? `${profile.fname || ''} ${profile.lname || ''}` : 'Profile'}
                sx={{ width: 40, height: 40 }}
              />
            </Box>
          </Tooltip>
        </Box>
      </Box>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 320,
            borderRadius: 3,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        {/* Account Section */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={profile?.profilepicture || import.meta.env.VITE_NO_PROFILE_PIC_URL}
            sx={{ width: 56, height: 56 }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.trim() || 'Traveler' : 'Traveler'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{profile?.email}</Typography>
          </Box>
        </Box>
        <Divider />
        {/* Primary Links */}
        {/* <List dense disablePadding>
          <ListItemButton onClick={() => goTo('/profile')}>
            <ListItemIcon sx={{ minWidth: 36 }}><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="My Profile" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
          </ListItemButton>
          <ListItemButton onClick={() => goTo('/settings')}>
            <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
          </ListItemButton>
        </List>
        <Divider sx={{ my: 0.5 }} /> */}
        <List dense disablePadding>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 36 }}><HelpOutlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Get Help" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 36 }}><ShieldIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Privacy Policy" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 36 }}><GavelIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Terms of Service" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 36 }}><ContactSupportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Contact Us" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
        </List>
        <Divider />
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', position: 'relative', minHeight: 64 }}>
          <LogoutButton onClick={handleLogout} size="small" startIcon={<LogoutIcon fontSize="small" />}>Log out</LogoutButton>
        </Box>
      </Popover>
    </>
  );
};

export default TopBar;