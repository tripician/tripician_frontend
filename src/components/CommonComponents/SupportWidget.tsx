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
import TripicianAIDoodle from '../../tripicianai/doodle/TripicianAIDoodle';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { onFeedbackPromptRequested, markFeedbackPromptShown } from '../../utils/feedbackPrompt';
import FeedbackDialog from './FeedbackDialog';

/**
 * SupportWidget - the quiet corner concierge.
 * Replaces the old floating TripicianAI chatbot: TripicianAI now lives on its own page
 * (and inside every trip), while this button handles feedback, updates and help.
 */
import type { CommandBarState } from '../../tripicianai/commandbar/commandModes';

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

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [updatesDialogOpen, setUpdatesDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  /**
   * The feedback nudge balloon. Requested by TripCreationModal (trip created)
   * or TripicianAIPage (ten seconds of TripicianAI use) via the shared feedbackPrompt
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

  // package.json's version, put in at build time (see vite.config.ts).
  const appVersion = __APP_VERSION__;
  // 2.1.0: it now works an answer out in steps (what you are asking, then timing,
  // live conditions and news only when they matter) and offers to turn it into a
  // plan. The same assistant doing more, so a minor version. 2.0.0 was when it
  // stopped being a signed-in feature.
  const tripicianAIVersion = '2.1.0';

  /*
   * This release, not every release. The dialog is called "What's new" and it
   * carries the version chips below it, so it describes the version it is
   * stamped with. 3.1.0 replaced the 3.0.0 list (Intelligence before sign-up,
   * stories in search, replies in the feed, live co-editing, joining checks);
   * 3.2.0 replaced the 3.1.0 one (encrypted chats, photography posts,
   * Intelligence showing its thinking, the profile portfolio, story prompts).
   *
   * Every line points at something that shipped. Nothing here is a plan.
   */
  const updateItems = [
    { icon: <SearchRoundedIcon fontSize="small" />, text: "Search finds posts too - a place, a word or a #tag now brings up travellers' posts alongside people, plans and stories." },
    { icon: <ForumRoundedIcon fontSize="small" />, text: "Reply to any comment on the Wall, and hide, block, report or delete from each comment's own menu." },
    { icon: <FlagRoundedIcon fontSize="small" />, text: 'Add countries you visited before Tripician - send a photo from the trip, and once it is checked the country joins your travel stamps.' },
    { icon: <ShieldRoundedIcon fontSize="small" />, text: 'Child safety - "a minor at risk" is now its own reason whenever you report something, and our Child Safety Standards have their own page.' },
    { icon: <HelpOutlineRoundedIcon fontSize="small" />, text: 'Help center answers on cancelling Tripician Pro and on payments that did not go through.' },
  ];

  const closeMenu = () => setAnchorEl(null);

  const menuItems = [
    {
      icon: <TripicianAIDoodle size={22} alive />,
      label: 'Ask Tripician Intelligence',
      sub: 'Your travel companion',
      onClick: () => { closeMenu(); navigate('/tripicianai'); },
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
      {/* Out of the way while the feedback form is open: it sits above MUI dialogs,
          and on a phone the form is full screen, so it floated over the form. */}
      <Zoom in={!feedbackDialogOpen} timeout={300}>
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
            Tripician Intelligence v{tripicianAIVersion}
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
                return (
                  <ListItem key={item.text} disableGutters sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1, display: 'grid', placeItems: 'center',
                        backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper',
                        border: '1px solid', borderColor: 'warning.light', color: 'warning.dark',
                      }}>
                        {item.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }} />
                  </ListItem>
                );
              })}
            </List>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip icon={<VerifiedRoundedIcon />} label={`Tripician v${appVersion}`} color="primary" size="small" />
              <Chip icon={<PublicRoundedIcon />} label={`Tripician Intelligence v${tripicianAIVersion}`} color="secondary" size="small" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdatesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Feedback dialog: its own component, with attachments and a close button. */}
      <FeedbackDialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} />
    </>
  );
};

export default SupportWidget;
