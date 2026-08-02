import React from "react";
import { Box, Typography, IconButton, Avatar, Tooltip, Popover, Divider, List, ListItemButton, ListItemText, ListItemIcon, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import NotificationsOffOutlinedIcon from "@mui/icons-material/NotificationsOffOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShieldIcon from '@mui/icons-material/PrivacyTip';
import GavelIcon from '@mui/icons-material/Gavel';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SearchBar from "../../../components/CommonComponents/SearchBar";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { clearUser } from '../../../store/userSlice';
import { clearSessionData } from '../../../utils/authSession';
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';

interface TopBarProps {
  showSearch?: boolean;
  logo?: React.ReactNode; // custom logo element (left area when no search)
  centerNode?: React.ReactNode; // absolutely centered content (e.g., trip title + status)
  showBurger?: boolean; // mobile nav burger; hide in focused contexts (e.g. the trip planner) that have their own exit
}

const TopBar: React.FC<TopBarProps> = ({ showSearch = true, logo, centerNode, showBurger = true }) => {
  const { profile } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthToken();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<HTMLElement | null>(null);

  const displayName = profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.trim() || 'Me' : 'Me';
  const initials = displayName.charAt(0).toUpperCase();

  const open = Boolean(anchorEl);
  const id = open ? 'profile-popover' : undefined;

  const notifOpen = Boolean(notifAnchorEl);
  const notifId = notifOpen ? 'notifications-popover' : undefined;

  const handleAvatarClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    try {
      clearSessionData();
      dispatch(clearUser());
      handleClose();
      navigate('/signin');
    } catch (e) {
      console.error('Logout error', e);
    }
  };


  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: 52,
          position: "sticky",
          top: 0,
          zIndex: 1100,
          background: (theme) => theme.palette.mode === 'light'
            ? 'rgba(255,255,255,0.82)'
            : 'rgba(14,14,14,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'light'
            ? 'rgba(0,0,0,0.07)'
            : 'rgba(255,255,255,0.07)',
          px: 2,
          boxShadow: 'none',
        }}
      >        
        {centerNode && (
          <Box sx={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%, -50%)', display:'flex', alignItems:'center', gap:1 }}>
            {centerNode}
          </Box>
        )}

        {/* Left Section - Search or Logo */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', pr: 2, gap: 1 }}>
          {/* Burger - mobile/tablet only; hidden where the host page opts out (showBurger={false}) */}
          {showBurger && (
          <IconButton
            size="small"
            onClick={() => window.dispatchEvent(new CustomEvent('nav:toggleMobile'))}
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
              '&:hover': { backgroundColor: 'rgba(255,56,92,0.07)' },
            }}
          >
            <MenuRoundedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
          </IconButton>
          )}
          {showSearch ? (
            <Box sx={{ maxWidth: 380, width: '100%' }}>
              <SearchBar />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>{logo}</Box>
          )}
        </Box>

        {/* Right Section - Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          {/* Guest: Sign In / Sign Up */}
          {!authLoading && !isAuthenticated ? (
            <>
              <Button
                onClick={() => navigate('/signin')}
                variant="outlined"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontFamily: "'Inter',sans-serif",
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  px: 1.75,
                  py: 0.6,
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': { borderColor: '#FF385C', color: '#FF385C', bgcolor: 'transparent' },
                }}
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                variant="contained"
                size="small"
                sx={{
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontFamily: "'Inter',sans-serif",
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  px: 1.75,
                  py: 0.65,
                }}
              >
                Sign Up
              </Button>
            </>
          ) : isAuthenticated ? (
            <>
          {/* Notifications */}
          <Tooltip title="Notifications" arrow>
            <IconButton
              aria-describedby={notifId}
              size="small"
              onClick={(e) => setNotifAnchorEl(e.currentTarget)}
              sx={{
                width: 34, height: 34,
                borderRadius: '10px',
                transition: 'background 0.18s ease, transform 0.18s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,56,92,0.07)',
                  transform: 'scale(1.06)',
                },
              }}
            >
              <NotificationsNoneIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Box sx={{ width: '1px', height: 22, bgcolor: 'divider', mx: 0.5 }} />

          {/* Profile Avatar */}
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
                ml: 0.5,
                '&:hover': { transform: 'scale(1.06)' },
                transition: 'transform .18s ease',
              }}
            >
              <Avatar
                src={profile?.profilepicture || undefined}
                alt={displayName}
                sx={{
                  width: 34, height: 34,
                  bgcolor: '#FF385C',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '-0.01em',
                }}
              >{!profile?.profilepicture && initials}</Avatar>
            </Box>
          </Tooltip>
            </>
          ) : null /* auth loading - render nothing */}
        </Box>
      </Box>

      {/* Notifications Popover */}
      <Popover
        id={notifId}
        open={notifOpen}
        anchorEl={notifAnchorEl}
        onClose={() => setNotifAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 320,
            borderRadius: '16px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>
            Notifications
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, px: 3, gap: 1.5 }}>
          <NotificationsOffOutlinedIcon sx={{ fontSize: 38, color: 'text.disabled' }} />
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
            All quiet on the horizon
          </Typography>
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'text.disabled', textAlign: 'center' }}>
            Followers, invites & trip updates will land here.
          </Typography>
        </Box>
      </Popover>

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
            width: 280,
            borderRadius: '16px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        {/* Profile section */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={profile?.profilepicture || undefined}
            sx={{
              width: 60, height: 60,
              bgcolor: '#FF385C',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#fff',
            }}
          >{!profile?.profilepicture && initials}</Avatar>
          <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
            <Typography sx={{ fontFamily:"'Inter',sans-serif", fontWeight: 700, fontSize:'0.975rem', letterSpacing:'-0.01em', color:'text.primary' }} noWrap>
              {displayName === 'T' ? 'Traveler' : displayName}
            </Typography>
            <Typography sx={{ fontSize:'0.73rem', color:'text.disabled', mt: 0.2 }} noWrap>
              {profile?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 2 }} />

        {/* Links */}
        <List dense disablePadding sx={{ py: 1, px: 1 }}>
          { [
            { icon: <HelpOutlineIcon sx={{ fontSize: 17 }} />, label: 'Get Help', href: '/get-help' },
            { icon: <ShieldIcon sx={{ fontSize: 17 }} />, label: 'Privacy Policy', href: '/privacy-policy' },
            { icon: <GavelIcon sx={{ fontSize: 17 }} />, label: 'Terms & Conditions', href: '/terms-and-conditions' },
            { icon: <ContactSupportIcon sx={{ fontSize: 17 }} />, label: 'Contact Us', href: '/contact-us' },
            { icon: <ShieldIcon sx={{ fontSize: 17, transform: 'rotate(180deg)' }} />, label: 'About Us', href: '/about-us' },
          ].map(({ icon, label, href }) => (
            <ListItemButton
              key={label}
              component="a"
              href={href}
              sx={{
                px: 1.5, py: 0.9, borderRadius: '10px',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                transition: 'all 0.15s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{icon}</ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: 500, fontFamily: "'Inter',sans-serif" }} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              px: 1.5, py: 0.9, borderRadius: '10px',
              color: '#FF385C',
              '&:hover': { bgcolor: 'rgba(255,56,92,0.07)' },
              transition: 'all 0.15s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}><LogoutIcon sx={{ fontSize: 17 }} /></ListItemIcon>
            <ListItemText primary="Log out" primaryTypographyProps={{ fontSize: 13, fontWeight: 600, fontFamily:"'Inter',sans-serif" }} />
          </ListItemButton>
        </Box>
      </Popover>
    </>
  );
};

export default TopBar;