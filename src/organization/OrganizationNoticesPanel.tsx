// The group's announcements: one author, everyone in the member list, and it never leaves that list.
// Not mail and not a feed. Public messages are OrganizationPostsPanel; notices to one trip's travellers are trip announcements.
// The join queue used to live under this too. It sits with the trips it is about now, on the Trips tab.

import React from 'react';
import {
  Alert, Avatar, Box, Button, IconButton, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import { IconPin, IconPinnedFilled, IconTrash } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import SectionHeader from '../components/ui/SectionHeader';
import { runsOrganizationTrips, type Organization, type OrganizationAnnouncement } from './types';

const MAX_BODY = 2000;

interface Props {
  organization: Organization;
}

const OrganizationNoticesPanel: React.FC<Props> = ({ organization }) => {
  const theme = useTheme();
  const canPost = runsOrganizationTrips(organization);
  const business = organization.kind === 'business';

  const [notices, setNotices] = React.useState<OrganizationAnnouncement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const resp = await apiServices.getOrganizationAnnouncements(organization.id);
      setNotices(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      // The board failing must not take the join queue below it down too.
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  React.useEffect(() => { void load(); }, [load]);

  const post = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await apiServices.createOrganizationAnnouncement(organization.id, text, false);
      // Prepended rather than refetched: the server already returned the row,
      // with the author's name and face resolved.
      if (resp.data) setNotices((prev) => [resp.data, ...prev]);
      setBody('');
    } catch {
      setError('That notice could not be posted.');
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (notice: OrganizationAnnouncement) => {
    const next = !notice.pinned;
    setNotices((prev) => prev.map((n) => (n.id === notice.id ? { ...n, pinned: next } : n)));
    try {
      await apiServices.updateOrganizationAnnouncement(notice.id, { Pinned: next });
      // Pinned sorts first, so the order the server would return has changed.
      await load();
    } catch {
      setNotices((prev) => prev.map((n) => (n.id === notice.id ? { ...n, pinned: !next } : n)));
      setError('That change did not save.');
    }
  };

  const remove = async (notice: OrganizationAnnouncement) => {
    const keep = notices;
    setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    try {
      await apiServices.deleteOrganizationAnnouncement(notice.id);
    } catch {
      setNotices(keep);
      setError('That notice could not be removed.');
    }
  };

  const card = {
    borderRadius: '16px',
    border: `1px solid ${theme.custom.surface.border}`,
    bgcolor: 'background.paper',
    p: 2,
  } as const;

  return (
    <Box>
      <SectionHeader
        title="Announcements"
        subtitle="Everyone in this group sees these. Nobody outside it does."
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {canPost && (
        <Box sx={{ ...card, mb: 2 }}>
          <TextField
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            placeholder={business ? 'Something the team needs to know.' : 'Something the group needs to know.'}
            multiline
            minRows={2}
            fullWidth
            variant="standard"
            InputProps={{ disableUnderline: true }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {body.length > MAX_BODY - 200 ? `${MAX_BODY - body.length} characters left` : ''}
            </Typography>
            <Button variant="contained" size="small" onClick={() => void post()} disabled={!body.trim() || busy}>
              {busy ? 'Posting...' : 'Post'}
            </Button>
          </Box>
        </Box>
      )}

      {loading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading...</Typography>
      ) : notices.length === 0 ? (
        <Box sx={{ ...card, borderStyle: 'dashed', textAlign: 'center', py: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {canPost
              ? 'Nothing announced yet. Post the first one.'
              : 'Nothing announced yet.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {notices.map((n) => (
            <Box key={n.id} sx={card}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar src={n.authorAvatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                  {(n.authorName ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {n.authorName ?? 'Someone'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </Typography>
                    {n.pinned && (
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        Pinned
                      </Typography>
                    )}
                  </Box>
                  {/* pre-line, never markup: the body is stored unformatted so it
                      can never carry markup to a reader. */}
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
                  >
                    {n.body}
                  </Typography>
                </Box>

                {canPost && (
                  <Box sx={{ display: 'flex', flexShrink: 0 }}>
                    <Tooltip title={n.pinned ? 'Unpin' : 'Pin to the top'}>
                      <IconButton size="small" onClick={() => void togglePin(n)}>
                        {n.pinned ? <IconPinnedFilled size={16} /> : <IconPin size={16} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => void remove(n)}>
                        <IconTrash size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

    </Box>
  );
};

export default OrganizationNoticesPanel;
