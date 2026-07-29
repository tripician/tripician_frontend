import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Chip,
} from '@mui/material';
import { IconCoins, IconMessageCircle, IconUsers } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAuthToken } from '../../hooks/useAuth0Token';
import {
  fetchMyCreditHistory,
  creditActionLabel,
  CREDIT_PRICES,
  type NaviaCreditHistory,
} from '../../navia/naviaService';

const cardSx = {
  mb: 3,
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

const sectionTitleSx = {
  fontFamily: "'Inter',sans-serif",
  fontWeight: 700,
  fontSize: '0.95rem',
  color: 'text.primary',
  letterSpacing: '-0.01em',
} as const;

const CreditsSettings: React.FC = () => {
  const { token } = useAuthToken();
  const [history, setHistory] = useState<NaviaCreditHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyCreditHistory(token, 50);
        if (active) setHistory(data);
      } catch {
        if (active) setError("We couldn't load your credit activity. Please try again in a moment.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const wallet = history?.wallet ?? null;
  const pctLeft = wallet && wallet.totalGranted > 0
    ? Math.max(0, Math.min(100, (wallet.balance / wallet.totalGranted) * 100))
    : 0;
  const low = wallet !== null && wallet.balance <= 10;

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* ── Personal wallet ── */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconCoins size={17} />
            <Typography sx={sectionTitleSx}>Personal wallet</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", mb: 3, maxWidth: 520 }}>
            Credits power every conversation with Navia. This wallet covers your personal chat;
            each trip carries its own shared wallet that the whole group plans from.
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          )}

          {!loading && error && (
            <Typography sx={{ fontSize: '0.82rem', color: 'error.main', fontFamily: "'Inter',sans-serif" }}>
              {error}
            </Typography>
          )}

          {!loading && wallet && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '2.4rem', lineHeight: 1, color: low ? 'error.main' : 'text.primary' }}>
                  {wallet.balance}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                  credits remaining
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={pctLeft}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  mb: 2,
                  maxWidth: 420,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: low ? 'error.main' : 'primary.main',
                  },
                }}
              />

              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                    Granted
                  </Typography>
                  <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '1.05rem' }}>
                    {wallet.totalGranted}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                    Used
                  </Typography>
                  <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '1.05rem' }}>
                    {wallet.totalSpent}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mt: 2.5 }}>
                Top-ups are on the way. Until then, every traveler starts with {wallet.totalGranted || 300} credits on us.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── What a credit buys ── */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ ...sectionTitleSx, mb: 0.5 }}>What a credit buys</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", mb: 2.5 }}>
            Simple, fixed prices, you always know the cost before Navia gets to work.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {CREDIT_PRICES.map((price, i) => (
              <Box
                key={price.label}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  py: 1.25,
                  borderTop: i === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  {price.wallet === 'personal'
                    ? <IconMessageCircle size={15} style={{ flexShrink: 0, opacity: 0.55 }} />
                    : <IconUsers size={15} style={{ flexShrink: 0, opacity: 0.55 }} />}
                  <Typography sx={{ fontSize: '0.85rem', fontFamily: "'Inter',sans-serif", color: 'text.primary' }}>
                    {price.label}
                  </Typography>
                  <Chip
                    label={price.wallet === 'personal' ? 'Personal' : 'Trip wallet'}
                    size="small"
                    sx={{
                      height: 18, fontSize: '0.62rem', fontWeight: 600, borderRadius: '6px',
                      bgcolor: 'action.hover', color: 'text.secondary',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap' }}>
                  {price.cost} {price.cost === 1 ? 'credit' : 'credits'}
                </Typography>
              </Box>
            ))}
          </Box>

          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mt: 2 }}>
            Trip-wallet actions spend from the trip's shared balance, check it any time from the coin
            chip in that trip's chat panel. If Navia ever fails to answer, the credits come straight back.
          </Typography>
        </CardContent>
      </Card>

      {/* ── Recent activity ── */}
      <Card sx={{ ...cardSx, mb: 0 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ ...sectionTitleSx, mb: 0.5 }}>Recent activity</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", mb: 2 }}>
            Every grant, spend, and refund on your personal wallet.
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={22} />
            </Box>
          )}

          {!loading && !error && (history?.entries?.length ?? 0) === 0 && (
            <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif", py: 1 }}>
              Nothing yet, say hello to Navia and your first entry will appear here.
            </Typography>
          )}

          {!loading && !error && (history?.entries?.length ?? 0) > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {history!.entries.map((entry, i) => (
                <Box
                  key={`${entry.createdAt}-${i}`}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    py: 1.1,
                    borderTop: i === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontFamily: "'Inter',sans-serif", color: 'text.primary', fontWeight: 500 }}>
                      {creditActionLabel(entry.action)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                      {dayjs(entry.createdAt).format('MMM D, YYYY · h:mm A')}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Inter',sans-serif",
                      color: entry.delta > 0 ? 'success.main' : 'text.primary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreditsSettings;
