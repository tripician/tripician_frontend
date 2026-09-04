import React from 'react';
import { Avatar, Box, Button, IconButton, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import { IconPin, IconPinFilled, IconSpeakerphone, IconTrash } from '@tabler/icons-react';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { formatRelativeTime } from '../../utils/relativeTime';
import type { TripAnnouncement } from '../../types/announcements';

interface TripAnnouncementsProps {
  tripId: string;
  /** Trip admin: can post, pin and remove. Members only read. */
  canManage: boolean;
  /** Non-members get nothing at all, so the panel does not mount for them. */
  isMember: boolean;
  /** Render the empty state instead of collapsing away. Used when this owns a whole tab. */
  showEmpty?: boolean;
}

const TripAnnouncements: React.FC<TripAnnouncementsProps> = ({ tripId, canManage, isMember, showEmpty = false }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [items, setItems] = React.useState<TripAnnouncement[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!token || !tripId || !isMember) { setLoaded(true); return; }
    let active = true;
    apiServices
      .getTripAnnouncements(token, tripId)
      .then((r) => { if (active) setItems(Array.isArray(r?.data) ? r.data : []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [token, tripId, isMember]);

  if (!isMember || !loaded) return null;
  if (items.length === 0 && !canManage && !showEmpty) return null;

  const post = async () => {
    const body = draft.trim();
    if (!token || !body || busy) return;
    setBusy(true);
    try {
      const { data } = await apiServices.createTripAnnouncement(token, tripId, body);
      setItems((prev) => [data, ...prev]);
      setDraft('');
      setComposing(false);
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Could not post that announcement.' } }));
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (a: TripAnnouncement) => {
    if (!token) return;
    const pinned = !a.pinned;
    setItems((prev) =>
      [...prev.map((x) => (x.id === a.id ? { ...x, pinned } : x))]
        .sort((x, y) => Number(y.pinned) - Number(x.pinned) || Date.parse(y.createdAt) - Date.parse(x.createdAt)),
    );
    try { await apiServices.updateTripAnnouncement(token, tripId, a.id, { pinned }); } catch { /* reverts on reload */ }
  };

  const remove = async (a: TripAnnouncement) => {
    if (!token) return;
    setItems((prev) => prev.filter((x) => x.id !== a.id));
    try { await apiServices.deleteTripAnnouncement(token, tripId, a.id); } catch { /* reverts on reload */ }
  };

  return (
    <Box
      component="section"
      aria-label="Trip announcements"
      sx={{
        mt: { xs: 3, md: 4 },
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: theme.custom.surface.brandTint,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: { xs: 2, md: 2.5 }, py: 1.75 }}>
        <IconSpeakerphone size={18} stroke={1.9} />
        <Typography variant="h6" component="h2" sx={{ flex: 1, color: 'text.primary' }}>
          Announcements
        </Typography>
        {canManage && !composing && (
          <Button size="small" variant="contained" onClick={() => setComposing(true)}>
            Post
          </Button>
        )}
      </Box>

      {composing && (
        <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2 }}>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            placeholder="Departure moved to 5:30am. Be at the pickup point by 5:15."
            helperText={`${draft.length}/2000`}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="contained" disabled={busy || !draft.trim()} onClick={() => void post()}>
              {busy ? 'Posting…' : 'Post announcement'}
            </Button>
            <Button color="inherit" onClick={() => { setComposing(false); setDraft(''); }}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {items.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: { xs: 2, md: 2.5 }, pb: 2.25 }}>
          Nothing yet. Post the things people need to know before they leave.
        </Typography>
      ) : (
        <Box>
          {items.map((a) => (
            <Box
              key={a.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                px: { xs: 2, md: 2.5 },
                py: 1.75,
                borderTop: `1px solid ${theme.custom.surface.border}`,
                bgcolor: a.pinned ? theme.custom.surface.hover : 'transparent',
              }}
            >
              <Avatar src={a.authorAvatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13, mt: 0.25 }}>
                {a.authorName?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {a.authorName || 'Trip organiser'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {formatRelativeTime(a.createdAt)}
                  </Typography>
                  {a.pinned && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      Pinned
                    </Typography>
                  )}
                </Box>
                {/* Plain text from the server, rendered as a child so React escapes it. */}
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', mt: 0.5, lineHeight: 1.65, whiteSpace: 'pre-line' }}
                >
                  {a.body}
                </Typography>
              </Box>

              {canManage && (
                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                  <Tooltip title={a.pinned ? 'Unpin' : 'Pin to top'}>
                    <IconButton size="small" onClick={() => void togglePin(a)}>
                      {a.pinned ? <IconPinFilled size={15} /> : <IconPin size={15} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => void remove(a)}>
                      <IconTrash size={15} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TripAnnouncements;
