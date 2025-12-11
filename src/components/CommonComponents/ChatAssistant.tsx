import React, { useState } from 'react';
import {
  Avatar,
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
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'Hi! How can I help you plan your next trip today?' }
  ]);
  const [input, setInput] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [updatesDialogOpen, setUpdatesDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const theme = useTheme();
  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
  const appEnv = import.meta.env.VITE_ENV || 'local';
  const updateItems = [
    {
      icon: RocketLaunchRoundedIcon,
      text: 'Personalized home hero driven by your live trip stats.'
    },
    {
      icon: SecurityRoundedIcon,
      text: 'Dashboard permissions refined so members collaborate safely.'
    },
    {
      icon: SyncRoundedIcon,
      text: 'Profile edits now refresh instantly across the app.'
    }
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { id: Date.now()+'' , role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    // Placeholder assistant echo
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now()+'' , role: 'assistant', content: `You said: ${input.trim()}` }]);
    }, 400);
    setInput('');
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 110,
          zIndex: 1700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
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
            boxShadow: optionsOpen ? theme.shadows[8] : theme.shadows[2]
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
                <IconButton
                  size="small"
                  onClick={() => setVersionDialogOpen(true)}
                  aria-label="Show software version"
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="New Updates" placement="left">
                <IconButton
                  size="small"
                  onClick={() => setUpdatesDialogOpen(true)}
                  aria-label="Show latest updates"
                >
                  <NewReleasesOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share Feedback" placement="left">
                <IconButton
                  size="small"
                  onClick={() => setFeedbackDialogOpen(true)}
                  aria-label="Open feedback form"
                >
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
          color="primary"
          onClick={() => setOpen(o => !o)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 1700,
            boxShadow: 4,
            '&:hover': { boxShadow: 8 }
          }}
        >
          <ChatIcon />
        </Fab>
      </Zoom>

      {/* Chat Window */}
      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 100,
            width: { xs: '85vw', sm: 380 },
            height: 460,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1700,
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Avatar sx={{ width: 36, height: 36, mr: 1, bgcolor: 'primary.main' }}>AI</Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Trip Assistant</Typography>
              <Typography variant="caption" color="text.secondary">Ask anything about planning</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {/* Messages */}
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', backgroundColor: theme.palette.mode === 'light' ? 'grey.50' : 'background.default' }}>
            {messages.map(m => (
              <Box key={m.id} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    maxWidth: '80%',
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                    color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    boxShadow: 1,
                    border: 1,
                    borderColor: m.role === 'user' ? 'primary.dark' : 'divider'
                  }}
                >
                  {m.content}
                </Box>
              </Box>
            ))}
          </Box>
          <Divider />
          {/* Input */}
          <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            />
            <Fab color="primary" size="small" onClick={handleSend} disabled={!input.trim()}>
              <SendIcon fontSize="small" />
            </Fab>
          </Box>
        </Paper>
      )}

      <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon color="primary" />
          Software Version
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            backgroundColor: theme.palette.mode === 'light' ? 'grey.50' : 'background.default'
          }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip
                icon={<VerifiedRoundedIcon />}
                label={`Version ${appVersion}`}
                color="primary"
              />
              <Chip
                icon={<PublicRoundedIcon />}
                label={`Environment ${appEnv}`}
                variant="outlined"
                color="primary"
              />
            </Stack>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, rgba(25,118,210,0.12), rgba(25,118,210,0.18))'
                  : 'linear-gradient(135deg, rgba(144,202,249,0.15), rgba(21,101,192,0.3))',
                border: '1px solid',
                borderColor: 'primary.light',
                color: theme.palette.mode === 'light' ? 'primary.dark' : 'primary.light'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                You&apos;re running the latest Tripician experience.
              </Typography>
              <Typography variant="body2">
                Let us know if something feels off so we can polish the journey.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={updatesDialogOpen} onClose={() => setUpdatesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleasesOutlinedIcon color="warning" />
          Latest Updates
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,193,7,0.06)' : 'rgba(255,183,77,0.12)'
          }}
        >
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Fresh drops engineered to make planning with friends effortless.
            </Typography>
            <List disablePadding>
              {updateItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <ListItem key={item.text} disableGutters sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper',
                          border: '1px solid',
                          borderColor: 'warning.light',
                          color: 'warning.dark'
                        }}
                      >
                        <IconComponent fontSize="small" />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }}
                    />
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

      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FeedbackOutlinedIcon color="secondary" />
          Share Feedback
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            backgroundColor: theme.palette.mode === 'light' ? 'rgba(156,39,176,0.04)' : 'rgba(206,147,216,0.1)'
          }}
        >
          <Stack spacing={2}>
            <Chip
              icon={<SendIcon fontSize="small" />}
              label="We read every message."
              color="secondary"
              variant="outlined"
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            />
            <Typography variant="body2" color="text.secondary">
              Help us craft smarter trips by sharing ideas, highlights, or hiccups.
            </Typography>
            <TextField
              label="Tell us what you think"
              placeholder="e.g. I loved the planner timeline, but..."
              fullWidth
              multiline
              minRows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper'
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFeedback('');
              setFeedbackDialogOpen(false);
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatAssistant;
