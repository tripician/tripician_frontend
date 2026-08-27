import React, { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../theme';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import HeadsetMicRoundedIcon from '@mui/icons-material/HeadsetMicRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import NaviaOrb from '../../navia/NaviaOrb';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import { onFeedbackPromptRequested, markFeedbackPromptShown } from '../../utils/feedbackPrompt';

/**
 * SupportWidget - the quiet corner concierge.
 * Replaces the old floating Navia chatbot: Navia now lives on its own page
 * (and inside every trip), while this button handles feedback, updates and help.
 */
import type { CommandBarState } from '../../navia/commandbar/commandModes';

interface SupportWidgetProps {
  /** The command bar shares this corner below lg. Step up, or stand down. */
  commandBar?: CommandBarState;
}

const SupportWidget: React.FC<SupportWidgetProps> = ({ commandBar = 'none' }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  // Matches the FAB's own `bottom: { xs: 88, lg: 24 }` breakpoint so the balloon
  // stays vertically aligned with it above and below the lg cutoff.
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const auth = useAuthToken();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [updatesDialogOpen, setUpdatesDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [creditsGranted, setCreditsGranted] = useState(0);

  /**
   * The feedback nudge balloon. Requested by TripCreationModal (trip created)
   * or NaviaPage (ten seconds of Navia use) via the shared feedbackPrompt
   * event - see utils/feedbackPrompt.ts for why a window event rather than
   * shared state. `markFeedbackPromptShown` is called here, not by the
   * requester, so the one-time flag is only burned once something was
   * actually shown to look at.
   */
  const [balloonOpen, setBalloonOpen] = useState(false);
  const balloonHandledRef = useRef(false);

  useEffect(() => onFeedbackPromptRequested(() => {
    if (balloonHandledRef.current || menuOpen || feedbackDialogOpen) return;
    balloonHandledRef.current = true;
    markFeedbackPromptShown();
    setBalloonOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Ignored balloons close themselves; a user who wants to act on it later can
  // still open feedback from the support menu at any time. A separate effect
  // (rather than returning this cleanup from the handler above) because a
  // CustomEvent listener's callback return value is not a useEffect cleanup -
  // it is discarded, and the timer would leak past unmount.
  useEffect(() => {
    if (!balloonOpen) return;
    const hideTimer = setTimeout(() => setBalloonOpen(false), 14000);
    return () => clearTimeout(hideTimer);
  }, [balloonOpen]);

  const openFeedbackFromBalloon = () => {
    setBalloonOpen(false);
    setFeedbackDialogOpen(true);
  };

  const appVersion = import.meta.env.VITE_APP_VERSION || '2.1.0';
  const naviaVersion = '1.0.0';

  /*
   * Newest first, and every line has to name something that actually shipped.
   * The list had not been touched since 2.0 and described a planner with a trip
   * directory, which is no longer what the product is: the three entries at the
   * top are the reason someone opens the app when they are not planning.
   */
  const updateItems = [
    { icon: AutoStoriesRoundedIcon,  text: 'After stories - write up a trip you took, with your own photographs, and publish it to your profile.' },
    { icon: MenuBookRoundedIcon,     text: 'The book - any story lays out as an A5 hardcover. Look through every page, then download the print-ready PDF.' },
    { icon: GroupsRoundedIcon,       text: 'Trip recruitment - open a trip so travellers can ask to join. You approve everyone, and money never routes through Tripician.' },
    { icon: VerifiedRoundedIcon,     text: 'Identity verification - a verified traveller carries a mark on their profile and on every trip they host.' },
    { icon: SyncRoundedIcon,         text: 'Profiles read as a diary - an intro in your own words, and your stories above your itineraries.' },
    { icon: RocketLaunchRoundedIcon, text: 'Reality check - travel time between stops, overloaded days & closures, measured not guessed.' },
    { icon: SecurityRoundedIcon,     text: 'Verified places - every suggested spot checked against a live listing, closed ones dropped.' },
    { icon: SecurityRoundedIcon,     text: 'Publish validation - title, description & all days planned before going live.' },
  ];

  const closeMenu = () => setAnchorEl(null);

  const menuItems = [
    {
      icon: <NaviaOrb size={18} />,
      label: 'Ask Navia',
      sub: 'Your travel companion',
      onClick: () => { closeMenu(); navigate('/navia'); },
    },
    {
      icon: <FeedbackOutlinedIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />,
      label: 'Share feedback',
      sub: 'We read every word',
      onClick: () => { closeMenu(); setFeedbackDialogOpen(true); },
    },
    {
      icon: <NewReleasesOutlinedIcon sx={{ fontSize: 18, color: '#F59E0B' }} />,
      label: "What's new",
      sub: 'Fresh from the workshop',
      onClick: () => { closeMenu(); setUpdatesDialogOpen(true); },
    },
    {
      icon: <HelpOutlineRoundedIcon sx={{ fontSize: 18, color: '#0EA5E9' }} />,
      label: 'Help center',
      sub: 'Guides & answers',
      onClick: () => { closeMenu(); navigate('/get-help'); },
    },
  ];

  return (
    <>
      {/* Floating support button */}
      <Zoom in timeout={300}>
        <Tooltip title="Support & feedback" placement="left" arrow>
          <Fab
            size="medium"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Support and feedback"
            sx={{
              position: 'fixed',
              right: 20,
              display: commandBar === 'expanded' ? { xs: 'none', lg: 'inline-flex' } : 'inline-flex',
              bottom: { xs: commandBar === 'collapsed' ? 148 : 88, lg: 24 },
              zIndex: 1700,
              width: 48,
              height: 48,
              background: isLight ? '#fff' : '#1a2230',
              color: menuOpen ? 'primary.main' : (isLight ? '#555' : 'rgba(255,255,255,0.7)'),
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: isLight
                ? '0 6px 24px rgba(0,0,0,0.12)'
                : '0 6px 24px rgba(0,0,0,0.45)',
              transition: 'color .2s, transform .2s',
              '&:hover': {
                background: isLight ? '#fff' : '#22304a',
                color: 'primary.main',
              },
            }}
          >
            <HeadsetMicRoundedIcon sx={{ fontSize: 22 }} />
          </Fab>
        </Tooltip>
      </Zoom>

      {/* Feedback nudge balloon - beside the FAB, not blocking it, self-dismissing */}
      <AnimatePresence>
        {balloonOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'fixed',
              right: 76,
              bottom: isLgUp ? 20 : (commandBar === 'collapsed' ? 144 : 84),
              display: !isLgUp && commandBar === 'expanded' ? 'none' : undefined,
              zIndex: 1699,
            }}
          >
            <Box
              onClick={openFeedbackFromBalloon}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') openFeedbackFromBalloon(); }}
              sx={{
                position: 'relative',
                width: 232,
                bgcolor: isLight ? '#fff' : '#1a2230',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: '14px',
                boxShadow: isLight ? '0 10px 32px rgba(0,0,0,0.16)' : '0 10px 32px rgba(0,0,0,0.5)',
                p: 1.75,
                pr: 3,
                cursor: 'pointer',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  right: -7,
                  marginTop: '-7px',
                  width: 14,
                  height: 14,
                  bgcolor: isLight ? '#fff' : '#1a2230',
                  borderRight: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
                  borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
                  transform: 'rotate(-45deg)',
                },
              }}
            >
              <IconButton
                onClick={(e) => { e.stopPropagation(); setBalloonOpen(false); }}
                aria-label="Dismiss"
                size="small"
                sx={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, color: 'text.disabled' }}
              >
                <CloseRoundedIcon sx={{ fontSize: 13 }} />
              </IconButton>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', mb: 0.4 }}>
                Got a second?
              </Typography>
              <Typography sx={{ fontSize: '0.76rem', lineHeight: 1.45, color: 'text.secondary' }}>
                Tell us what's working (or not). Your first note earns <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>5 bonus AI credits</Box>.
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu */}
      <Popover
        open={menuOpen}
        anchorEl={anchorEl}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: -1.5,
            width: 264,
            borderRadius: '16px',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isLight
              ? '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)'
              : '0 16px 48px rgba(0,0,0,0.55)',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            How can we help?
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
            Support, ideas & everything in between
          </Typography>
        </Box>
        <Divider />
        <List dense disablePadding sx={{ py: 0.75, px: 0.75 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.label}
              onClick={item.onClick}
              sx={{
                borderRadius: '10px',
                px: 1.25,
                py: 0.9,
                '&:hover': { bgcolor: isLight ? alpha(BRAND.coral, 0.05) : alpha(BRAND.coral, 0.10) },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.sub}
                primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: 11, color: 'text.disabled' }}
              />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Box sx={{ px: 2, py: 1.1, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled', fontWeight: 600 }}>
            Tripician v{appVersion}
          </Typography>
          <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>·</Typography>
          <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled', fontWeight: 600 }}>
            Navia v{naviaVersion}
          </Typography>
        </Box>
      </Popover>

      {/* Updates dialog */}
      <Dialog open={updatesDialogOpen} onClose={() => setUpdatesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleasesOutlinedIcon color="warning" />
          Fresh from the Workshop
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,193,7,0.06)' : 'rgba(255,183,77,0.12)' }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">New drops engineered to make planning with friends effortless.</Typography>
            <List disablePadding>
              {updateItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <ListItem key={item.text} disableGutters sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1, display: 'grid', placeItems: 'center',
                        backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper',
                        border: '1px solid', borderColor: 'warning.light', color: 'warning.dark',
                      }}>
                        <IconComponent fontSize="small" />
                      </Box>
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }} />
                  </ListItem>
                );
              })}
            </List>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip icon={<VerifiedRoundedIcon />} label={`Tripician v${appVersion}`} color="primary" size="small" />
              <Chip icon={<PublicRoundedIcon />} label={`Navia v${naviaVersion}`} color="secondary" size="small" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdatesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FeedbackOutlinedIcon color="secondary" />
          Tell Us Everything
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: theme.palette.mode === 'light' ? 'rgba(156,39,176,0.04)' : 'rgba(206,147,216,0.1)' }}>
          <Stack spacing={2}>
            <Chip
              icon={<SendRoundedIcon fontSize="small" />}
              label="A human reads every message."
              color="secondary"
              variant="outlined"
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            />
            <Typography variant="body2" color="text.secondary">Loved something? Hit a bump? Wish a feature existed? This is the fastest way to shape Tripician.</Typography>
            <TextField
              label="Your thoughts"
              placeholder="e.g. The planner timeline is great, but..."
              fullWidth
              multiline
              minRows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={feedbackSending || feedbackDone}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper' } }}
            />
            {feedbackDone && (
              <Typography variant="body2" color="success.main" fontWeight={600}>
                {creditsGranted > 0
                  ? `✓ Sent - thank you! +${creditsGranted} bonus AI credits added 🎉`
                  : '✓ Sent - thank you for making Tripician better!'}
              </Typography>
            )}
            {feedbackError && <Typography variant="body2" color="error">{feedbackError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setFeedbackDialogOpen(false); setFeedback(''); setFeedbackDone(false); setFeedbackError(''); }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={feedbackSending || !feedback.trim()}
            onClick={async () => {
              if (!auth.token || !feedback.trim()) return;
              setFeedbackSending(true);
              setFeedbackError('');
              try {
                const resp = await apiServices.sendFeedback(auth.token, feedback.trim());
                setCreditsGranted(Number(resp?.data?.creditsGranted) || 0);
                setFeedback('');
                setFeedbackDone(true);
                setTimeout(() => { setFeedbackDialogOpen(false); setFeedbackDone(false); setCreditsGranted(0); }, 2400);
              } catch {
                setFeedbackError("Couldn't send that - please try again.");
              } finally {
                setFeedbackSending(false);
              }
            }}
          >
            {feedbackSending ? 'Sending…' : feedbackDone ? 'Sent ✓' : 'Send feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SupportWidget;
