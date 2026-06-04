import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
  useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { useNavia } from '../../navia/useNavia';
import NaviaMessage from '../../navia/NaviaMessage';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ChatAssistantProps {
  tripId?: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ tripId }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isMobile = useIsMobile();
  const auth = useAuthToken();
  const { profile } = useSelector((state: RootState) => state.user);
  const { messages, isStreaming, sendMessage } = useNavia(tripId ?? '', auth.token);

  const greetingName = profile?.fname?.trim();
  const emptyGreeting = tripId
    ? `Hi${greetingName ? ` ${greetingName}` : ''}! I'm Navia — your AI co-planner for this trip. Ask me about destinations, pacing, packing, or what to do next.`
    : `Hi${greetingName ? ` ${greetingName}` : ''}! I'm Navia, your AI travel companion. I can see your trips and help you plan your next adventure.`;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [updatesDialogOpen, setUpdatesDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [logoAnimating, setLogoAnimating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const appEnv = import.meta.env.VITE_ENV || 'local';

  const NAVIA_LOGO =  import.meta.env.VITE_NAVIA_LOGO as string | undefined;
  const [attentionAnim, setAttentionAnim] = useState(false);

  const updateItems = [
    { icon: RocketLaunchRoundedIcon, text: 'Trip planner v1.0 — day-by-day itinerary builder with stays, spots & foods.' },
    { icon: SecurityRoundedIcon,     text: 'Published trips now visible on the Home feed & Community Adventures.' },
    { icon: SyncRoundedIcon,         text: 'Travel Risk Monitor with live news, weather & currency intel (Beta).' },
    { icon: RocketLaunchRoundedIcon, text: 'Navia AI assistant — ask anything about your trip inside the planner.' },
    { icon: SecurityRoundedIcon,     text: 'Trip sharing with shareable links and member role management.' },
    { icon: SyncRoundedIcon,         text: 'Profile picture upload, preferences settings & theme toggle.' },
  ];

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!open) {
        setAttentionAnim(true);

        setTimeout(() => {
          setAttentionAnim(false);
        }, 2500);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [open]);

  return (
    <>
      {/* Quick tools pill */}
      <Box
        sx={{
          position: 'fixed',
          right: 50,
          bottom: { xs: 168, lg: 120 },
          zIndex: 1700,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <Paper
          elevation={optionsOpen ? 6 : 3}
          sx={{
            borderRadius: 999,
            py: optionsOpen ? 1.5 : 0.5,
            px: 0.75,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: optionsOpen ? 1 : 0.5,
            transition: 'all .2s ease',
            backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper',
            boxShadow: optionsOpen ? theme.shadows[8] : theme.shadows[2],
          }}
        >
          <Tooltip title={optionsOpen ? 'Hide quick tools' : 'Show quick tools'} placement="left">
            <IconButton
              size="small"
              onClick={() => setOptionsOpen(prev => !prev)}
              aria-label={optionsOpen ? 'Collapse assistant quick tools' : 'Expand assistant quick tools'}
            >
              {optionsOpen ? (
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              ) : (
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {optionsOpen && (
            <>
              <Divider flexItem sx={{ my: 0.5 }} />
              <Tooltip title="Software Version" placement="left">
                <IconButton size="small" onClick={() => setVersionDialogOpen(true)} aria-label="Show software version">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="New Updates" placement="left">
                <IconButton size="small" onClick={() => setUpdatesDialogOpen(true)} aria-label="Show latest updates">
                  <NewReleasesOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share Feedback" placement="left">
                <IconButton size="small" onClick={() => setFeedbackDialogOpen(true)} aria-label="Open feedback form">
                  <FeedbackOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Paper>
      </Box>

      {/* Floating FAB */}
      <Zoom in timeout={300}>
        <Fab
          disableRipple
          onClick={() => {
            setLogoAnimating(true);
            setOpen(o => !o);

            setTimeout(() => {
              setLogoAnimating(false);
            }, 500);
          }}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: { xs: 88, lg: 24 },
            zIndex: 1700,

            width: 90,
            height: 90,
            minHeight: 'unset',

            background: 'transparent',
            boxShadow: 'none',

            '&:hover': {
              background: 'transparent',
              boxShadow: 'none',
            },

            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              opacity: 0,
              transition: 'all .25s ease',
            },

          }}
        >
          <img
            src={NAVIA_LOGO}
            alt="Navia"
            draggable={false}
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',

              transform:
                logoAnimating
                  ? 'rotate(90deg) scale(1.06)'
                  : attentionAnim
                    ? 'scale(1.12)'
                    : 'scale(1)',

              filter:
                attentionAnim
                  ? `
                    drop-shadow(0 0 8px rgba(255,56,92,.35))
                    drop-shadow(0 0 18px rgba(255,56,92,.25))
                  `
                  : 'none',

              transition:
                attentionAnim
                  ? 'transform 1.2s ease-in-out, filter .6s ease'
                  : 'transform .45s cubic-bezier(.22,1,.36,1)',
            }}
          />
        </Fab>
      </Zoom>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              right: isMobile ? 12 : 40,
              left: isMobile ? 12 : 'auto',
              bottom: isMobile ? 100 : 110,
              zIndex: 1700,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: isMobile ? '100%' : { xs: '88vw', sm: 370 },
                height: isMobile ? 'min(72vh, 520px)' : 520,
                maxHeight: isMobile ? '72vh' : 520,
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isLight
                  ? '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(255,56,92,0.08)'
                  : '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              {/* Messages */}
              <Box sx={{
                flexGrow: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                background: isLight
                  ? 'linear-gradient(160deg, #fff9fa 0%, #fff 100%)'
                  : 'linear-gradient(160deg, #0e1012 0%, #151820 100%)',
                '&::-webkit-scrollbar': { width: 0 },
                '&:hover::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { borderRadius: 4, background: 'rgba(255,56,92,0.25)' },
              }}>
                <Box sx={{ position: 'relative', zIndex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {messages.length === 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.8 }}>
                      <Box sx={{
                        width: 38, height: 38,
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Box
                          component="img"
                          src="https://res.cloudinary.com/ddt3rcyhv/image/upload/v1780497710/ChatGPT_Image_Jun_3_2026_07_53_49_PM_ubsb8c.png"
                          alt="Navia"
                          sx={{
                            width: 50,
                            height: 50,
                            display: 'block',
                          }}
                        />
                      </Box>
                      <Box sx={{
                        px: 1.5, py: 1, maxWidth: '78%',
                        borderRadius: '16px 16px 16px 4px',
                        background: isLight ? '#fff' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        fontSize: '0.82rem', lineHeight: 1.5,
                        color: isLight ? '#1a1a1a' : '#f0f0f0',
                      }}>
                        {emptyGreeting}
                      </Box>
                    </Box>
                  )}
                  {messages.map(m => (
                    <NaviaMessage key={m.id} message={m} isLight={isLight} />
                  ))}
                  <div ref={messagesEndRef} />
                </Box>
              </Box>

              {/* Input */}
              <Box sx={{
                px: 1.5, py: 1.25, flexShrink: 0,
                background: isLight ? '#fff' : '#0e1012',
                borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Ask Navia anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      background: isLight ? '#f5f7f9' : 'rgba(255,255,255,0.05)',
                      '& fieldset': { borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: 1.5 },
                    },
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  sx={{
                    width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
                    background: (input.trim() && !isStreaming) ? 'linear-gradient(135deg,#FF385C,#D91A50)' : (isLight ? '#f0f0f0' : 'rgba(255,255,255,0.08)'),
                    color: (input.trim() && !isStreaming) ? '#fff' : (isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'),
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: (input.trim() && !isStreaming) ? 'linear-gradient(135deg,#e02d50,#c01545)' : undefined,
                      transform: (input.trim() && !isStreaming) ? 'scale(1.05)' : undefined,
                    },
                    '&.Mui-disabled': { background: isLight ? '#f0f0f0' : 'rgba(255,255,255,0.05)', color: isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)' },
                  }}
                >
                  {isStreaming
                    ? <CircularProgress size={15} sx={{ color: 'inherit' }} />
                    : <SendRoundedIcon sx={{ fontSize: 17 }} />
                  }
                </IconButton>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version dialog */}
      <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon color="primary" />
          Software Version
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: theme.palette.mode === 'light' ? 'grey.50' : 'background.default' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip icon={<VerifiedRoundedIcon />} label={`Version ${appVersion}`} color="primary" />
              <Chip icon={<PublicRoundedIcon />} label={`Environment ${appEnv}`} variant="outlined" color="primary" />
            </Stack>
            <Box sx={{
              p: 2, borderRadius: 2,
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, rgba(25,118,210,0.12), rgba(25,118,210,0.18))'
                : 'linear-gradient(135deg, rgba(144,202,249,0.15), rgba(21,101,192,0.3))',
              border: '1px solid', borderColor: 'primary.light',
              color: theme.palette.mode === 'light' ? 'primary.dark' : 'primary.light',
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>You&apos;re running the latest Tripician experience.</Typography>
              <Typography variant="body2">Let us know if something feels off so we can polish the journey.</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Updates dialog */}
      <Dialog open={updatesDialogOpen} onClose={() => setUpdatesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleasesOutlinedIcon color="warning" />
          Latest Updates
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,193,7,0.06)' : 'rgba(255,183,77,0.12)' }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">Fresh drops engineered to make planning with friends effortless.</Typography>
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
          Share Feedback
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: theme.palette.mode === 'light' ? 'rgba(156,39,176,0.04)' : 'rgba(206,147,216,0.1)' }}>
          <Stack spacing={2}>
            <Chip
              icon={<SendRoundedIcon fontSize="small" />}
              label="We read every message."
              color="secondary"
              variant="outlined"
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            />
            <Typography variant="body2" color="text.secondary">Help us craft smarter trips by sharing ideas, highlights, or hiccups.</Typography>
            <TextField
              label="Tell us what you think"
              placeholder="e.g. I loved the planner timeline, but..."
              fullWidth
              multiline
              minRows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setFeedback(''); setFeedbackDialogOpen(false); }}>Submit</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatAssistant;
