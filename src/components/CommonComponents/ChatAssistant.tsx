import React, { useState } from 'react';
import { Box, Fab, Zoom, Paper, IconButton, Typography, TextField, Divider, Avatar, useTheme } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

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
  const theme = useTheme();

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
    </>
  );
};

export default ChatAssistant;
