import React, { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
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
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShieldIcon from '@mui/icons-material/PrivacyTip';
import GavelIcon from '@mui/icons-material/Gavel';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { clearUser } from '../../../store/userSlice';
import { APP_NAV_ITEMS, navItemFromPath } from '../navConfig';
import Badge from '@mui/material/Badge';
import {
  fetchUnreadCount,
  fetchNotifications,
  markAllNotificationsReadLocal,
  markNotificationReadLocal,
} from '../../../store/notificationSlice';
import { apiServices } from '../../../services/APIs/apiServices';
import { useAuthToken } from '../../../hooks/useAuth0Token';

interface NotificationMeta {
  Icon: React.ElementType;
  color: string;
  bg: string;
}

// The backend now sends notificationType - key icons on the type first and
// only fall back to sniffing the message text for older payloads.
function notifMeta(type: string | undefined, msg: string): NotificationMeta {
  switch (type) {
    case 'Follow':        return { Icon: PersonAddAltRoundedIcon, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
    case 'TripInvite':    return { Icon: GroupsRoundedIcon, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' };
    case 'TripCreated':   return { Icon: FlightTakeoffRoundedIcon, color: '#FF385C', bg: 'rgba(255,56,92,0.10)' };
    case 'TripUpdated':   return { Icon: FlightTakeoffRoundedIcon, color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' };
    case 'TripPublished': return { Icon: PublicRoundedIcon, color: '#10B981', bg: 'rgba(16,185,129,0.10)' };
    case 'Comment':
    case 'Reply':         return { Icon: ChatBubbleOutlineRoundedIcon, color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' };
  }
  const m = (msg || '').toLowerCase();
  if (m.includes('follow') || m.includes('connect')) return { Icon: PersonAddAltRoundedIcon, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
  if (m.includes('like') || m.includes('react')) return { Icon: FavoriteRoundedIcon, color: '#EF4444', bg: 'rgba(239,68,68,0.10)' };
  if (m.includes('comment') || m.includes('repl') || m.includes('chat')) return { Icon: ChatBubbleOutlineRoundedIcon, color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' };
  if (m.includes('publish') || m.includes('live')) return { Icon: PublicRoundedIcon, color: '#10B981', bg: 'rgba(16,185,129,0.10)' };
  if (m.includes('invit') || m.includes('join') || m.includes('member')) return { Icon: GroupsRoundedIcon, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' };
  if (m.includes('trip') || m.includes('creat')) return { Icon: FlightTakeoffRoundedIcon, color: '#FF385C', bg: 'rgba(255,56,92,0.10)' };
  return { Icon: NotificationsNoneIcon, color: '#6366F1', bg: 'rgba(99,102,241,0.10)' };
}

function relTime(iso?: string): string {
  try {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const seconds = Math.max(0, Math.floor(diff / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

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
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  const { token, isAuthenticated, loading: authLoading } = useAuthToken();
  const notificationHubRef = React.useRef<signalR.HubConnection | null>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<HTMLElement | null>(null);

  const activeNav = navItemFromPath(location.pathname);
  const displayName = profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.trim() || 'Traveler' : 'Traveler';
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    dispatch(fetchUnreadCount());
    dispatch(fetchNotifications());
    const poll = setInterval(() => {
      dispatch(fetchUnreadCount());
      dispatch(fetchNotifications());
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchUnreadCount());
        dispatch(fetchNotifications());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!token) {
      try { notificationHubRef.current?.stop(); } catch { /* already stopped */ }
      notificationHubRef.current = null;
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
    if (!API_BASE) return;

    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notifications`, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('NotificationCreated', () => {
      dispatch(fetchNotifications());
      dispatch(fetchUnreadCount());
    });

    connection.on('NotificationRead', (payload: any) => {
      if (payload?.id) dispatch(markNotificationReadLocal(String(payload.id)));
      dispatch(fetchUnreadCount());
    });

    connection.on('NotificationsReadAll', () => {
      dispatch(markAllNotificationsReadLocal());
      dispatch(fetchUnreadCount());
    });

    (async () => {
      try {
        await connection.start();
        if (cancelled) return;
        notificationHubRef.current = connection;
        try { await connection.invoke('JoinMyNotifications'); } catch { /* group join is best-effort */ }
      } catch {
        // silent: polling remains active fallback
      }
    })();

    return () => {
      cancelled = true;
      connection.off('NotificationCreated');
      connection.off('NotificationRead');
      connection.off('NotificationsReadAll');
      if (notificationHubRef.current === connection) {
        notificationHubRef.current = null;
      }
      try { connection.stop(); } catch { /* already stopped */ }
    };
  }, [dispatch, token]);

  const markAllRead = async () => {
    const accessToken = token || localStorage.getItem('accessToken');
    if (!accessToken) return;
    try {
      await apiServices.markAllNotificationsAsRead(accessToken);
      dispatch(markAllNotificationsReadLocal());
      dispatch(fetchUnreadCount());
    } catch {
      // no-op
    }
  };

  const markOneRead = async (notificationId: string) => {
    const accessToken = token || localStorage.getItem('accessToken');
    if (!accessToken || !notificationId) return;
    dispatch(markNotificationReadLocal(notificationId));
    try {
      await apiServices.markNotificationAsRead(accessToken, notificationId);
      dispatch(fetchUnreadCount());
    } catch {
      dispatch(fetchNotifications());
      dispatch(fetchUnreadCount());
    }
  };

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
          background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(15,15,19,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: theme.custom.surface.border,
          px: { xs: 1.5, md: 2.5 },
          gap: { xs: 1, md: 2 },
        }}
      >
        {/* Brand */}
        <Box
          onClick={() => navigate('/community')}
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

        {/* Desktop nav - labeled pills, centered */}
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
              gap: 0.5,
              p: 0.5,
              borderRadius: 999,
              border: '1px solid',
              borderColor: theme.custom.surface.border,
              background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.03)',
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
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.75,
                    py: 0.9,
                    borderRadius: 999,
                    border: 'none',
                    background: active ? theme.custom.surface.brandTint : 'transparent',
                    cursor: item.disabled ? 'default' : 'pointer',
                    color: active ? 'primary.main' : 'text.secondary',
                    fontFamily: 'inherit',
                    transition: `background ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                    '&:hover': {
                      background: active ? theme.custom.surface.brandTint : theme.custom.surface.hover,
                      color: active ? 'primary.main' : 'text.primary',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.custom.ring}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {/* The Navia orb renders larger than the other icons but must not
                      stretch the pill height, negative margin lets it overflow. */}
                  <Box sx={{ position: 'relative', display: 'flex', ...(item.id === 'navia' ? { my: -0.75 } : {}) }}>
                    <item.Icon size={item.id === 'navia' ? 30 : 20} stroke={1.9} color="currentColor" />
                    {item.id === 'risk' && (
                      <Box
                        aria-hidden="true"
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: theme.palette.success.main,
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
                  {/* Navia is represented by the orb alone - no text label */}
                  {item.id !== 'navia' && (
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.84rem', fontWeight: active ? 700 : 600, lineHeight: 1, whiteSpace: 'nowrap' }}
                    >
                      {item.shortLabel}
                    </Typography>
                  )}
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {/* Guest: Sign In / Sign Up */}
          {!authLoading && !isAuthenticated ? (
            <>
              <Button
                onClick={() => navigate('/signin')}
                variant="outlined"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0, fontSize: '0.84rem' }}
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                variant="contained"
                sx={{ flexShrink: 0, fontSize: '0.84rem', fontWeight: 700 }}
              >
                Sign Up
              </Button>
            </>
          ) : isAuthenticated ? (
            <>
              {/* Primary CTA */}
              <Button
                onClick={onCreateTrip}
                variant="contained"
                startIcon={<AddRoundedIcon sx={{ fontSize: 20 }} />}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0, fontSize: '0.84rem', fontWeight: 700 }}
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
                  background: theme.custom.gradients.brand,
                  color: '#fff',
                  boxShadow: theme.custom.shadows.brandSm,
                  '&:hover': { background: theme.custom.gradients.brandHover },
                }}
              >
                <AddRoundedIcon fontSize="small" />
              </IconButton>

              <Tooltip title="Notifications" arrow>
                <IconButton
                  size="small"
                  aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                  onClick={(e) => {
                    setNotifAnchorEl(e.currentTarget);
                    dispatch(fetchNotifications());
                    dispatch(fetchUnreadCount());
                  }}
                  sx={{ width: 36, height: 36 }}
                >
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsNoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </Badge>
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
                    transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.spring}`,
                  }}
                >
                  <Avatar
                    src={profile?.profilepicture || undefined}
                    alt={displayName}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'primary.main',
                      fontSize: '0.85rem',
                      boxShadow: theme.custom.shadows.brandSm,
                    }}
                  >
                    {!profile?.profilepicture && initials}
                  </Avatar>
                </Box>
              </Tooltip>
            </>
          ) : null /* loading - render nothing to avoid flash */}
        </Box>
      </Box>

      {/* Notifications */}
      <Popover
        open={Boolean(notifAnchorEl)}
        anchorEl={notifAnchorEl}
        onClose={() => setNotifAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1.5, width: 360, borderRadius: '20px', overflow: 'hidden' } }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.25,
            pb: 2,
            background: theme.custom.gradients.brandSubtle,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '11px',
                  background: theme.custom.gradients.brand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.custom.shadows.brandSm,
                }}
              >
                <NotificationsActiveRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.15 }}>Notifications</Typography>
                {unreadCount > 0 && (
                  <Typography sx={{ fontSize: '0.66rem', color: 'primary.main', fontWeight: 700 }}>
                    {unreadCount} new
                  </Typography>
                )}
              </Box>
            </Box>
            <Button
              size="small"
              disabled={unreadCount <= 0}
              onClick={markAllRead}
              sx={{ fontSize: '0.7rem', fontWeight: 700, px: 1.25, py: 0.5, color: 'primary.main' }}
            >
              Mark all read
            </Button>
          </Box>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: '18px',
                background: theme.custom.surface.hover,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <NotificationsOffOutlinedIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.secondary' }}>
              All quiet on the horizon
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>Followers, invites & trip updates will land here</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map((notification: any) => {
              const meta = notifMeta(notification.notificationType, notification.message || '');
              const NotificationIcon = meta.Icon;
              return (
                <Box
                  key={notification.id}
                  onClick={() => markOneRead(String(notification.id))}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    px: 2.25,
                    py: 1.75,
                    cursor: 'pointer',
                    bgcolor: notification?.isRead ? 'transparent' : theme.custom.surface.brandTint,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    transition: 'background .15s',
                    '&:hover': { bgcolor: theme.custom.surface.hover },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.1,
                    }}
                  >
                    <NotificationIcon sx={{ fontSize: 18, color: meta.color }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        fontWeight: notification?.isRead ? 500 : 700,
                        color: 'text.primary',
                        lineHeight: 1.45,
                      }}
                    >
                      {notification.message || 'New activity'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.3 }}>
                      {relTime(notification.createdAt)}
                    </Typography>
                  </Box>
                  {!notification?.isRead && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        flexShrink: 0,
                        mt: 0.9,
                        boxShadow: '0 0 6px rgba(255,56,92,0.7)',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>

      {/* Account menu */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1.5, width: 280 } }}
      >
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2, textAlign: 'center' }}>
          <Avatar src={profile?.profilepicture || undefined} sx={{ width: 56, height: 56, mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
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
          <ListItemButton onClick={() => { navigate('/settings'); setAnchorEl(null); }} sx={{ py: 0.9 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><SettingsRoundedIcon sx={{ fontSize: 17 }} /></ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
          </ListItemButton>
          <Divider sx={{ my: 0.5, mx: 0.5 }} />
          {[
            { icon: <HelpOutlineIcon sx={{ fontSize: 17 }} />, label: 'Get Help', href: '/get-help' },
            { icon: <ShieldIcon sx={{ fontSize: 17 }} />, label: 'Privacy Policy', href: '/privacy-policy' },
            { icon: <GavelIcon sx={{ fontSize: 17 }} />, label: 'Terms', href: '/terms-and-conditions' },
            { icon: <ContactSupportIcon sx={{ fontSize: 17 }} />, label: 'Contact Us', href: '/contact-us' },
          ].map(({ icon, label, href }) => (
            <ListItemButton key={label} component="a" href={href} sx={{ py: 0.9 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <ListItemButton onClick={handleLogout} sx={{ color: 'primary.main' }}>
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
