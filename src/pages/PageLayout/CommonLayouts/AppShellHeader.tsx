import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  Popover,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShieldIcon from '@mui/icons-material/PrivacyTip';
import GavelIcon from '@mui/icons-material/Gavel';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { clearUser } from '../../../store/userSlice';
import SearchBar from '../../../components/CommonComponents/SearchBar';
import { APP_NAV_ITEMS, navItemFromPath } from '../navConfig';

interface AppShellHeaderProps {
  onCreateTrip: () => void;
}

const AppShellHeader: React.FC<AppShellHeaderProps> = ({ onCreateTrip }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<HTMLElement | null>(null);

  const activeNav = navItemFromPath(location.pathname);
  const displayName = profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.trim() || 'Traveler' : 'Traveler';
  const initials = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(clearUser());
      setAnchorEl(null);
      navigate('/signin');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: { xs: 56, md: 60 },
          position: 'relative',
          top: 0,
          zIndex: 1100,
          flexShrink: 0,
          background: (t) =>
            t.palette.mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(14,14,14,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)',
          px: { xs: 1.5, md: 2.5 },
          gap: { xs: 1, md: 2 },
        }}
      >
        {/* Brand */}
        <Box
          onClick={() => navigate('/home')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            flexShrink: 0,
            mr: { lg: 1 },
          }}
        >
          <Box
            component="img"
            src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL}
            alt="Tripician"
            sx={{ height: { xs: 18, md: 22 }, width: 'auto', display: 'block' }}
          />
        </Box>

        {/* Desktop nav */}
        {isDesktop && (
          <Box
            component="nav"
            aria-label="Main"
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
            }}
          >
            {APP_NAV_ITEMS.map((item) => {
              const active = activeNav?.id === item.id;
              const button = (
                <Box
                  key={item.id}
                  component="button"
                  onClick={() => !item.disabled && navigate(item.path)}
                  disabled={item.disabled}
                  data-nav-id={item.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    px: 1.5,
                    py: 0.75,
                    minWidth: 64,
                    borderRadius: '12px',
                    border: `1px solid ${active ? 'rgba(255,56,92,0.22)' : 'transparent'}`,
                    background: active ? 'rgba(255,56,92,0.10)' : 'transparent',
                    cursor: item.disabled ? 'default' : 'pointer',
                    color: active ? '#FF385C' : 'text.secondary',
                    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                    '&:hover': {
                      background: active ? 'rgba(255,56,92,0.12)' : 'rgba(0,0,0,0.04)',
                      color: active ? '#FF385C' : 'text.primary',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #FF385C',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {/* Icon with live dot for risk */}
                  <Box sx={{
                    position: 'relative',
                    display: 'flex',
                    '& svg': {
                      transition: 'transform 0.15s ease',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    },
                  }}>
                    <item.Icon
                      size={27}
                      stroke={1.75}
                      color={active ? '#FF385C' : 'currentColor'}
                    />
                    {item.id === 'risk' && (
                      <Box
                        className="nav-live-dot"
                        aria-hidden="true"
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#22c55e',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: '-3px',
                            borderRadius: '50%',
                            background: 'rgba(34,197,94,0.4)',
                            animation: 'radar-ping 1.8s ease-out infinite',
                          },
                        }}
                      />
                    )}
                  </Box>
                  
                </Box>
              );

              return item.tooltip ? (
                <Tooltip key={item.id} title={item.tooltip} placement="bottom" arrow>
                  {button}
                </Tooltip>
              ) : (
                <React.Fragment key={item.id}>{button}</React.Fragment>
              );
            })}
          </Box>
        )}

        

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: 'auto',   // pushes everything to the far right
          }}
        >

          {/* Primary CTA */}
          <Button
            onClick={onCreateTrip}
            variant="contained"
            startIcon={<AddRoundedIcon sx={{ fontSize: 20 }} />}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              flexShrink: 0,
              borderRadius: '50px',
              textTransform: 'none',
              fontFamily: "'Inter',sans-serif",
              fontWeight: 700,
              fontSize: '0.84rem',
              px: 2.25,
              py: 0.9,
              background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
              boxShadow: '0 4px 18px rgba(255,56,92,0.38)',
              '&:hover': {
                background: 'linear-gradient(135deg,#E31C5F 0%,#B01550 100%)',
                boxShadow: '0 8px 28px rgba(255,56,92,0.48)',
              },
            }}
          >
            New Trip
          </Button>

          <IconButton
            onClick={onCreateTrip}
            aria-label="Create new trip"
            sx={{
              display: { xs: 'inline-flex', sm: 'none' },
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#FF385C,#D91A50)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(255,56,92,0.4)',
              '&:hover': { background: 'linear-gradient(135deg,#E31C5F,#B01550)' },
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </IconButton>

          <Tooltip title="Notifications" arrow>
            <IconButton
              size="small"
              onClick={(e) => setNotifAnchorEl(e.currentTarget)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                '&:hover': { backgroundColor: 'rgba(255,56,92,0.07)' },
              }}
            >
              <NotificationsNoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Box sx={{ width: '1px', height: 22, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />

          <Tooltip title="Account" arrow>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'inline-flex',
                cursor: 'pointer',
                borderRadius: '50%',
                '&:hover': { transform: 'scale(1.05)' },
                transition: 'transform .18s ease',
              }}
            >
              <Avatar
                src={profile?.profilepicture || undefined}
                alt={displayName}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#FF385C',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 10px rgba(255,56,92,0.28)',
                }}
              >
                {!profile?.profilepicture && initials}
              </Avatar>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      <Popover
        open={Boolean(notifAnchorEl)}
        anchorEl={notifAnchorEl}
        onClose={() => setNotifAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { mt: 1.5, width: 320, borderRadius: '16px', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</Typography>
        </Box>
        <Divider />
        <Box sx={{ py: 5, px: 3, textAlign: 'center' }}>
          <NotificationsOffOutlinedIcon sx={{ fontSize: 38, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
            No notifications yet
          </Typography>
        </Box>
      </Popover>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { mt: 1.5, width: 280, borderRadius: '16px', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2, textAlign: 'center' }}>
          <Avatar src={profile?.profilepicture || undefined} sx={{ width: 56, height: 56, mx: 'auto', mb: 1, bgcolor: '#FF385C' }}>
            {!profile?.profilepicture && initials}
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }} noWrap>
            {displayName}
          </Typography>
          <Typography sx={{ fontSize: '0.73rem', color: 'text.disabled' }} noWrap>
            {profile?.email}
          </Typography>
        </Box>
        <Divider sx={{ mx: 2 }} />
        <List dense disablePadding sx={{ py: 1, px: 1 }}>
          {[
            { icon: <HelpOutlineIcon sx={{ fontSize: 17 }} />, label: 'Get Help', href: '/get-help' },
            { icon: <ShieldIcon sx={{ fontSize: 17 }} />, label: 'Privacy Policy', href: '/privacy-policy' },
            { icon: <GavelIcon sx={{ fontSize: 17 }} />, label: 'Terms', href: '/terms-and-conditions' },
            { icon: <ContactSupportIcon sx={{ fontSize: 17 }} />, label: 'Contact Us', href: '/contact-us' },
          ].map(({ icon, label, href }) => (
            <ListItemButton key={label} component="a" href={href} sx={{ borderRadius: '10px', py: 0.9 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: '10px', color: '#FF385C' }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <LogoutIcon sx={{ fontSize: 17 }} />
            </ListItemIcon>
            <ListItemText primary="Log out" primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
          </ListItemButton>
        </Box>
      </Popover>
    </>
  );
};

export default AppShellHeader;
