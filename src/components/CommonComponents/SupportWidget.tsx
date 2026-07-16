import React, { useState } from 'react';
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
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
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
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';

/**
 * SupportWidget - the quiet corner concierge.
 * Replaces the old floating Navia chatbot: Navia now lives on its own page
 * (and inside every trip), while this button handles feedback, updates and help.
 */
const SupportWidget: React.FC = () => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
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

  const appVersion = import.meta.env.VITE_APP_VERSION || '2.1.0';
  const naviaVersion = '1.0.0';

  const updateItems = [
    { icon: RocketLaunchRoundedIcon, text: 'Tripician 2.0 - new trip view & community feed.' },
    { icon: SecurityRoundedIcon,     text: 'Publish validation - title, description & all days planned before going live.' },
    { icon: SyncRoundedIcon,         text: 'Community Adventures - browse real trips with day plans, nights & live reactions.' },
    { icon: RocketLaunchRoundedIcon, text: 'Navia AI - smarter trip co-planner inside every itinerary.' },
    { icon: SecurityRoundedIcon,     text: 'Premium trip view sidebar - date range, traveller profiles & live reactions.' },
    { icon: SyncRoundedIcon,         text: 'Profile picture upload, preferences & dark / light theme toggle.' },
  ];

  const closeMenu = () => setAnchorEl(null);

  const menuItems = [
    {
      icon: <NaviaOrb size={18} />,
      label: 'Ask Navia',
      sub: 'Your AI travel companion',
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
              bottom: { xs: 88, lg: 24 },
              zIndex: 1700,
              width: 48,
              height: 48,
              background: isLight ? '#fff' : '#1a2230',
              color: menuOpen ? '#FF385C' : (isLight ? '#555' : 'rgba(255,255,255,0.7)'),
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: isLight
                ? '0 6px 24px rgba(0,0,0,0.12)'
                : '0 6px 24px rgba(0,0,0,0.45)',
              transition: 'color .2s, transform .2s',
              '&:hover': {
                background: isLight ? '#fff' : '#22304a',
                color: '#FF385C',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <SupportAgentRoundedIcon sx={{ fontSize: 22 }} />
          </Fab>
        </Tooltip>
      </Zoom>

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
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
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
                '&:hover': { bgcolor: isLight ? 'rgba(255,56,92,0.05)' : 'rgba(255,56,92,0.10)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.sub}
                primaryTypographyProps={{ fontSize: 13.5, fontWeight: 650 }}
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
              <Chip icon={<PublicRoundedIcon />} label={`Navia AI v${naviaVersion}`} color="secondary" size="small" />
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
            {feedbackDone && <Typography variant="body2" color="success.main" fontWeight={600}>✓ Sent - thank you for making Tripician better!</Typography>}
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
                await apiServices.sendFeedback(auth.token, feedback.trim());
                setFeedback('');
                setFeedbackDone(true);
                setTimeout(() => { setFeedbackDialogOpen(false); setFeedbackDone(false); }, 1800);
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
