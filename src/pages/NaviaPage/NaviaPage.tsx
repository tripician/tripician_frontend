import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Chip,
  useTheme,
  Button,
  Tooltip,
} from '@mui/material';
import { IconBrain, IconSend, IconTrash, IconSparkles, IconPlus } from '@tabler/icons-react';
import { useNavia } from '../../navia/useNavia';
import NaviaMessage from '../../navia/NaviaMessage';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAppShell } from '../PageLayout/AppShellContext';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const STARTERS = [
  'Plan a 7-day trip to Japan for two people',
  'Where should I go in Europe in October with €1500?',
  'Best adventure destinations for a solo traveller',
  'Build a weekend itinerary in Santorini with culture and beaches',
  'Compare Bali vs Thailand for a 10-day trip',
  'What should I pack for a monsoon trip to Vietnam?',
];

const NaviaPage: React.FC = () => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const { token } = useAuthToken();
  const { openCreateTrip } = useAppShell();
  const { profile } = useSelector((state: RootState) => state.user);
  const { messages, isStreaming, sendMessage, clearMessages } = useNavia('', token);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const greetingName = profile?.fname?.trim();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarter = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Detect if latest Navia response looks like a trip plan (has destinations / nights)
  const lastNaviaMsg = [...messages].reverse().find((m) => m.role === 'navia' && !m.isStreaming);
  const showCreateTrip =
    lastNaviaMsg &&
    /day\s*\d|night|itinerary|destination|visit|explore|stay|flight|hotel/i.test(lastNaviaMsg.content);

  const isEmpty = messages.length === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: 760,
        mx: 'auto',
        width: '100%',
        px: { xs: 0, md: 2 },
      }}
    >
      {/* ── Page header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, md: 0 },
          pt: 3,
          pb: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(255,56,92,0.30)',
              flexShrink: 0,
            }}
          >
            <IconBrain size={22} color="#fff" stroke={1.6} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
              Navia
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
              AI travel companion ,general chat
            </Typography>
          </Box>
        </Box>

        {!isEmpty && (
          <Tooltip title="Clear conversation" arrow>
            <IconButton
              size="small"
              onClick={clearMessages}
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                color: 'text.disabled',
                '&:hover': { color: '#FF385C', bgcolor: 'rgba(255,56,92,0.07)' },
              }}
            >
              <IconTrash size={17} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Message list ────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, md: 0 },
          py: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {isEmpty ? (
          /* Empty state ,welcome + starters */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 3,
              textAlign: 'center',
              py: 6,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Inter',sans-serif",
                fontWeight: 700,
                fontSize: { xs: '1.3rem', md: '1.6rem' },
                letterSpacing: '-0.3px',
              }}
            >
              {greetingName ? `Hey ${greetingName}, where to next?` : 'Where to next?'}
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontFamily: "'Inter',sans-serif",
                fontSize: '0.95rem',
                maxWidth: 420,
              }}
            >
              Ask Navia anything ,destinations, itineraries, budgets, vibes. I'll turn your
              conversation into a real trip plan.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 560 }}>
              {STARTERS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  onClick={() => handleStarter(s)}
                  icon={<IconSparkles size={12} />}
                  sx={{
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 500,
                    fontSize: '0.78rem',
                    borderRadius: '50px',
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: '#FF385C',
                      color: '#FF385C',
                      bgcolor: 'rgba(255,56,92,0.06)',
                    },
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map((msg) => (
              <NaviaMessage key={msg.id} message={msg} isLight={isLight} />
            ))}

            {/* Create Trip CTA ,shown after any trip-plan-like response */}
            {showCreateTrip && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', pl: { xs: 0, md: 0 }, pb: 1 }}>
                <Button
                  onClick={openCreateTrip}
                  variant="contained"
                  size="small"
                  startIcon={<IconPlus size={15} />}
                  sx={{
                    mt: 0.5,
                    ml: '52px',
                    borderRadius: '50px',
                    textTransform: 'none',
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    px: 2,
                    background: 'linear-gradient(135deg,#FF385C,#D91A50)',
                    boxShadow: '0 4px 14px rgba(255,56,92,0.32)',
                    '&:hover': {
                      background: 'linear-gradient(135deg,#E31C5F,#B01550)',
                      boxShadow: '0 6px 20px rgba(255,56,92,0.42)',
                    },
                  }}
                >
                  Create this trip
                </Button>
              </Box>
            )}

            {/* Streaming indicator dots */}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: '52px', pb: 1 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#FF385C',
                      opacity: 0.6,
                      animation: `naviaTypingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                      '@keyframes naviaTypingDot': {
                        '0%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                        '50%': { transform: 'translateY(-4px)', opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* ── Input bar ───────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 0 },
          pb: { xs: 2, md: 3 },
          pt: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            borderRadius: '16px',
            border: '1.5px solid',
            borderColor: (t) =>
              t.palette.mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
            bgcolor: (t) =>
              t.palette.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)',
            px: 2,
            py: 1.25,
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            '&:focus-within': {
              borderColor: '#FF385C',
              boxShadow: '0 0 0 3px rgba(255,56,92,0.12)',
            },
          }}
        >
          <InputBase
            inputRef={inputRef}
            multiline
            maxRows={6}
            fullWidth
            placeholder="Ask Navia anything about travel…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            sx={{
              fontFamily: "'Inter',sans-serif",
              fontSize: '0.92rem',
              lineHeight: 1.55,
              '& .MuiInputBase-input': { p: 0 },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            sx={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '10px',
              background:
                input.trim() && !isStreaming
                  ? 'linear-gradient(135deg,#FF385C,#D91A50)'
                  : undefined,
              color: input.trim() && !isStreaming ? '#fff' : 'text.disabled',
              transition: 'all 0.15s ease',
              '&:hover': {
                background:
                  input.trim() && !isStreaming
                    ? 'linear-gradient(135deg,#E31C5F,#B01550)'
                    : undefined,
              },
            }}
          >
            <IconSend size={18} />
          </IconButton>
        </Box>
        <Typography
          sx={{
            mt: 0.75,
            fontSize: '0.7rem',
            color: 'text.disabled',
            textAlign: 'center',
            fontFamily: "'Inter',sans-serif",
          }}
        >
          Navia can make mistakes. Always verify travel details before booking.
        </Typography>
      </Box>
    </Box>
  );
};

export default NaviaPage;
