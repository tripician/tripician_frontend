import React from 'react';
import {
  Avatar, Box, Button, IconButton, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconTrash, IconSpeakerphone } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { formatRelativeTime } from '../utils/relativeTime';
import OrganizationImageField from './OrganizationImageField';
import { runsOrganizationTrips } from './types';
import type { Organization, OrganizationPost } from './types';

interface OrganizationPostsPanelProps {
  organization: Organization;
}

/**
 * What an organisation says to the community.
 *
 * Not a trip announcement: those are operational and members-only. These are
 * public, belong to the organisation rather than to any one trip, and carry an
 * optional picture.
 */
const OrganizationPostsPanel: React.FC<OrganizationPostsPanelProps> = ({ organization }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuthToken();
  const border = theme.custom.surface.border;

  const [posts, setPosts] = React.useState<OrganizationPost[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canPost = runsOrganizationTrips(organization);

  React.useEffect(() => {
    let active = true;
    apiServices.getOrganizationPosts(organization.id)
      .then((r) => { if (active) setPosts(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setPosts([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [organization.id]);

  const post = async () => {
    const body = draft.trim();
    if (!token || !body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiServices.createOrganizationPost(token, organization.id, { body, imageUrl: image });
      setPosts((prev) => [data, ...prev]);
      setDraft('');
      setImage(null);
    } catch {
      setError('That post could not be published.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try { await apiServices.removeOrganizationPost(token, organization.id, id); } catch { /* reverts on reload */ }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {canPost && (
        <Box sx={{ borderRadius: '16px', border: `1px solid ${border}`, p: 2.5, display: 'grid', gap: 1.5 }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            placeholder="Three places left on the Ladakh ride in October. Ask to join from the trip page."
            helperText={`${draft.length}/2000`}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          <OrganizationImageField
            organizationId={organization.id}
            slot="post"
            label="Picture (optional)"
            value={image}
            onChange={setImage}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              disabled={busy || !draft.trim()}
              onClick={() => void post()}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
            >
              {busy ? 'Posting' : 'Post to the community'}
            </Button>
            {(draft || image) && (
              <Button
                color="inherit"
                onClick={() => { setDraft(''); setImage(null); }}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Clear
              </Button>
            )}
          </Box>
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      )}

      {loaded && posts.length === 0 && (
        <Box sx={{ borderRadius: '16px', border: `1px dashed ${border}`, p: 3, textAlign: 'center' }}>
          <IconSpeakerphone size={20} style={{ color: theme.palette.text.disabled }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {canPost
              ? 'Nothing posted yet. What you write here shows up on your profile and in the community feed.'
              : 'This organization has not posted anything yet.'}
          </Typography>
        </Box>
      )}

      {posts.map((p) => (
        <Box key={p.id} sx={{ borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 1.75 }}>
            <Avatar src={p.organizationLogoUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
              {p.organizationName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                {p.organizationName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {formatRelativeTime(p.createdAt)}
              </Typography>
            </Box>
            {canPost && (
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => void remove(p.id)}>
                  <IconTrash size={15} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {p.imageUrl && (
            <Box component="img" src={p.imageUrl} alt="" sx={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }} />
          )}

          {/* Plain text from the server, rendered as a child so React escapes it. */}
          <Typography
            variant="body2"
            sx={{ color: 'text.primary', px: 2.5, py: 2, lineHeight: 1.65, whiteSpace: 'pre-line' }}
          >
            {p.body}
          </Typography>

          {p.tripId && (
            <Box sx={{ px: 2.5, pb: 2 }}>
              <Button
                size="small"
                onClick={() => navigate(`/trip/${p.tripId}`)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                See the trip
              </Button>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default OrganizationPostsPanel;
