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
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconSend, IconTrash, IconSparkles, IconPlus, IconCoins } from '@tabler/icons-react';
import { useNavia } from '../../navia/useNavia';
import { fetchMyCredits, extractTripFromChat, type NaviaCreditBalance } from '../../navia/naviaService';
import CreditUsagePopover from '../../navia/CreditUsagePopover';
import NaviaMessage from '../../navia/NaviaMessage';
import NaviaOrb from '../../navia/NaviaOrb';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAppShell } from '../PageLayout/AppShellContext';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { apiServices } from '../../services/APIs/apiServices';
import { matchCountryName } from '../../utils/countries';
import { scheduleFeedbackPrompt } from '../../utils/feedbackPrompt';
import { takePendingPrompt } from '../../utils/pendingNaviaPrompt';

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

  /*
   * Replay of the prompt typed on the landing hero, before this visitor had an
   * account. Three things make it fragile, and all three are handled here:
   *
   *  1. `useAuthToken` resolves in a mount effect, so `token` is null on the
   *     first render even though ProtectedRoute already confirmed the session.
   *     Streaming with a null token is a guaranteed 401 - NaviaController is
   *     [Authorize] class-wide - so the replay waits for it.
   *  2. StrictMode double-invokes effects in development. `takePendingPrompt`
   *     removes before it returns and the ref latches, so a second invocation
   *     is a no-op rather than a duplicate message.
   *  3. `useNavia` restores `messages` from session storage in its own mount
   *     effect. Gating on `token` puts this a render later, so it cannot be
   *     clobbered by that restore.
   *
   * Calls `sendMessage` directly rather than dispatching `navia:send`: the
   * function is already in hand, and that window event binds one handler to two
   * names, which is one more thing to get wrong.
   */
  const replayedRef = useRef(false);
  useEffect(() => {
    if (!token || replayedRef.current) return;
    const pending = takePendingPrompt();
    if (!pending) return;
    replayedRef.current = true;
    sendMessage(pending);
  }, [token, sendMessage]);

  const greetingName = profile?.fname?.trim();

  // Personal Navia credit balance (separate from any trip's group wallet).
  const [wallet, setWallet] = useState<NaviaCreditBalance | null>(null);
  const [creditAnchor, setCreditAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!token || isStreaming) return;
    fetchMyCredits(token)
      .then(setWallet)
      .catch(() => { /* chip is best-effort */ });
  }, [token, isStreaming]);
  const credits = wallet?.balance ?? null;

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

  // One of the two moments that can nudge a first-time user toward feedback -
  // ten seconds after they start actually chatting with Navia, not merely
  // having the page open. Fires once from the first message; does not restart
  // on every later one. See utils/feedbackPrompt.ts.
  const hasSentMessage = !isEmpty;
  useEffect(() => {
    if (!hasSentMessage) return;
    const timer = setTimeout(() => scheduleFeedbackPrompt('navia_used'), 10_000);
    return () => clearTimeout(timer);
  }, [hasSentMessage]);

  // ── One-click chat → trip ────────────────────────────────────────────────
  // Navia extracts the plan into structured data, the trip is created, and the
  // planner opens with everything seeded. Fallback: the blank creation modal.
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateFromChat = useCallback(async () => {
    if (!token || !lastNaviaMsg || creatingTrip) return;
    setCreatingTrip(true);
    // Held outside the try so the fallback can hand whatever was read out of the
    // chat to the create dialog instead of opening it blank.
    let salvaged: { name?: string; countries?: string[]; vibe?: string | null } | undefined;
    try {
      // The user message that produced this plan gives the extractor context.
      const planIdx = messages.findIndex((m) => m.id === lastNaviaMsg.id);
      const userPrompt = messages
        .slice(0, Math.max(planIdx, 0))
        .reverse()
        .find((m) => m.role === 'user')?.content;

      const extracted = await extractTripFromChat(lastNaviaMsg.content, userPrompt, token);
      const countries = Array.from(new Set(
        extracted.countries.map(matchCountryName).filter(Boolean),
      ));

      const name = extracted.name?.trim()
        || (countries.length > 0 ? `Trip to ${countries[0]}` : 'My Navia Trip');

      salvaged = { name, countries, vibe: extracted.vibe ?? null };

      if (countries.length === 0 && extracted.stops.length === 0) {
        throw new Error('Nothing usable extracted');
      }

      const createResp = await apiServices.createTrip(token, {
        name,
        description: '',
        countries,
        startDate: null,
        endDate: null,
        visibility: 0,
        currencyCode: 'USD',
        vibe: extracted.vibe ?? null,
        invites: [] as string[],
        plannerMode: 'Easy', // every new trip opens in the simple planner
      });
      const createdId: string | undefined =
        createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
      if (!createdId) throw new Error('Trip created but no id returned');

      const tripResp = await apiServices.getTripById(token, createdId);
      scheduleFeedbackPrompt('trip_created');
      navigate(`/tripplanner/${createdId}`, {
        state: { tripId: createdId, trip: tripResp.data, chatSeed: { stops: extracted.stops } },
      });
      // No state reset needed: navigation unmounts this page.
    } catch (err) {
      console.error('[NaviaPage] chat-to-trip failed', err);
      setCreatingTrip(false);
      setToast(salvaged
        ? "Couldn't build that automatically, so here it is in the form."
        : "Couldn't turn this chat into a trip, starting a fresh one.");
      openCreateTrip(salvaged);
    }
  }, [token, lastNaviaMsg, creatingTrip, messages, navigate, openCreateTrip]);

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
          <NaviaOrb size={40} processing={isStreaming} />
          <Box>
            <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
              Navia
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
              Your travel companion
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {credits !== null && (
            <Tooltip title="Your personal credits, tap for details" arrow>
              <Chip
                icon={<IconCoins size={13} />}
                label={credits}
                size="small"
                onClick={(e) => setCreditAnchor(e.currentTarget)}
                sx={{
                  height: 24,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: "'Inter',sans-serif",
                  borderRadius: '8px',
                  cursor: 'pointer',
                  bgcolor: credits <= 10 ? 'rgba(239,68,68,0.10)' : 'rgba(255,56,92,0.07)',
                  color: credits <= 10 ? '#ef4444' : '#FF385C',
                  border: `1px solid ${credits <= 10 ? 'rgba(239,68,68,0.25)' : 'rgba(255,56,92,0.18)'}`,
                  '& .MuiChip-icon': { color: 'inherit' },
                  '&:hover': { bgcolor: credits <= 10 ? 'rgba(239,68,68,0.16)' : 'rgba(255,56,92,0.12)' },
                }}
              />
            </Tooltip>
          )}
          <CreditUsagePopover
            open={Boolean(creditAnchor)}
            anchorEl={creditAnchor}
            onClose={() => setCreditAnchor(null)}
            wallet={wallet}
            title="Personal credits"
            subtitle="Powers your one-on-one chat with Navia."
          />
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
          /* Empty state - welcome + starters */
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
              Destinations, itineraries, budgets, hidden gems, ask away, and watch the
              conversation become a real trip.
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

            {/* Create Trip CTA - shown after any trip-plan-like response */}
            {showCreateTrip && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', pl: { xs: 0, md: 0 }, pb: 1 }}>
                <Button
                  onClick={handleCreateFromChat}
                  disabled={creatingTrip}
                  variant="contained"
                  size="small"
                  startIcon={creatingTrip ? <NaviaOrb size={15} processing /> : <IconPlus size={15} />}
                  sx={{
                    mt: 0.5,
                    ml: '52px',
                    borderRadius: '50px',
                    textTransform: 'none',
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    px: 2,
                  }}
                >
                  {creatingTrip ? 'Building your trip…' : 'Create this trip'}
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
              bgcolor: input.trim() && !isStreaming ? '#FF385C' : undefined,
              color: input.trim() && !isStreaming ? '#fff' : 'text.disabled',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: input.trim() && !isStreaming ? '#E31C5F' : undefined },
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

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default NaviaPage;
