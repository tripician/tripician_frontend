import React from 'react';
import {
  Alert, Avatar, Box, Button, IconButton, Menu, MenuItem, TextField, Typography, useTheme,
} from '@mui/material';
import { IconDots, IconMessageCircle, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { apiServices } from '../services/APIs/apiServices';
import SectionHeader from '../components/ui/SectionHeader';
import type { GroupDiscussionPost, Organization } from './types';

const MAX_BODY = 2000;
const PAGE = 20;

const when = (iso: string) => dayjs(iso).format('D MMM, h:mm A');

const Composer: React.FC<{
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}> = ({ placeholder, submitLabel, autoFocus, onSubmit, onCancel }) => {
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      if (await onSubmit(text)) setBody('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <TextField
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
        placeholder={placeholder}
        multiline
        minRows={2}
        fullWidth
        autoFocus={autoFocus}
        variant="standard"
        InputProps={{ disableUnderline: true }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {body.length > MAX_BODY - 200 ? `${MAX_BODY - body.length} characters left` : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onCancel && <Button size="small" onClick={onCancel} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>}
          <Button variant="contained" size="small" onClick={() => void submit()} disabled={!body.trim() || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {busy ? 'Posting' : submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// Same shape as a post on the Wall: the rare action sits behind a menu so a moderator's view is not a column of bins.
const Entry: React.FC<{ post: GroupDiscussionPost; small?: boolean; onRemove: () => void; children?: React.ReactNode }> = ({ post, small, onRemove, children }) => {
  const [menu, setMenu] = React.useState<HTMLElement | null>(null);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Avatar src={post.authorAvatarUrl ?? undefined} sx={{ width: small ? 26 : 34, height: small ? 26 : 34, fontSize: small ? 11 : 13 }}>
        {(post.authorName ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{post.authorName ?? 'A member'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>{when(post.createdAt)}</Typography>
        </Box>
        {/* Plain text with its line breaks, never markup. */}
        <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-line', overflowWrap: 'anywhere', color: 'text.primary' }}>
          {post.body}
        </Typography>
        {children}
      </Box>
      {post.canRemove && (
        <>
          <IconButton
            size="small"
            onClick={(e) => setMenu(e.currentTarget)}
            aria-label="Post options"
            sx={{ flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
          >
            <IconDots size={16} />
          </IconButton>
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
            <MenuItem onClick={() => { setMenu(null); onRemove(); }} sx={{ color: 'error.main' }}>
              <IconTrash size={15} style={{ marginRight: 10 }} />
              Remove
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  );
};

// The group talking among itself. Members only, never on the Wall; a reply tells the person replied to and nobody else.
const GroupDiscussionPanel: React.FC<{ organization: Organization }> = ({ organization }) => {
  const theme = useTheme();
  const groupId = organization.id;
  const [posts, setPosts] = React.useState<GroupDiscussionPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiServices.getGroupDiscussion(groupId)
      .then((r) => {
        if (!active) return;
        const rows = Array.isArray(r.data) ? r.data : [];
        setPosts(rows);
        setExhausted(rows.length < PAGE);
      })
      .catch(() => { if (active) { setPosts([]); setExhausted(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  const older = async () => {
    const last = posts[posts.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiServices.getGroupDiscussion(groupId, last.createdAt);
      const rows = Array.isArray(r.data) ? r.data : [];
      setPosts((prev) => [...prev, ...rows]);
      if (rows.length < PAGE) setExhausted(true);
    } catch {
      setError('Older posts could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  const start = async (body: string) => {
    setError(null);
    try {
      const r = await apiServices.postGroupDiscussion(groupId, body);
      if (r.data) setPosts((prev) => [r.data, ...prev]);
      return true;
    } catch {
      setError('That could not be posted. Try again.');
      return false;
    }
  };

  const reply = async (parentId: string, body: string) => {
    setError(null);
    try {
      const r = await apiServices.replyGroupDiscussion(groupId, parentId, body);
      if (r.data) {
        setPosts((prev) => prev.map((p) => (p.id === parentId ? { ...p, replies: [...p.replies, r.data] } : p)));
      }
      setReplyingTo(null);
      return true;
    } catch {
      setError('That reply could not be posted. The post may have been removed.');
      return false;
    }
  };

  const remove = async (postId: string, parentId?: string) => {
    if (!window.confirm('Remove this for everyone in the group?')) return;
    const keep = posts;
    setPosts((prev) => (parentId
      ? prev.map((p) => (p.id === parentId ? { ...p, replies: p.replies.filter((r) => r.id !== postId) } : p))
      : prev.filter((p) => p.id !== postId)));
    try {
      await apiServices.removeGroupDiscussion(groupId, postId);
    } catch {
      setPosts(keep);
      setError('That could not be removed.');
    }
  };

  const card = {
    borderRadius: '16px',
    border: `1px solid ${theme.custom.surface.border}`,
    bgcolor: 'background.paper',
    p: 2,
  } as const;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <SectionHeader title="Discussion" subtitle="Talk plans through with the group. Only members see this." />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ ...card, mb: 2 }}>
        <Composer placeholder={`Start a conversation in ${organization.name}`} submitLabel="Post" onSubmit={start} />
      </Box>

      {loading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading</Typography>
      ) : posts.length === 0 ? (
        <Box sx={{ ...card, borderStyle: 'dashed', textAlign: 'center', py: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nothing here yet. Ask where the group should go next.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {posts.map((p) => (
            <Box key={p.id} sx={card}>
              <Entry post={p} onRemove={() => void remove(p.id)}>
                {p.replies.length > 0 && (
                  <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5, pl: 1.5, borderLeft: `2px solid ${theme.custom.surface.border}` }}>
                    {p.replies.map((r) => (
                      <Entry key={r.id} post={r} small onRemove={() => void remove(r.id, p.id)} />
                    ))}
                  </Box>
                )}

                {replyingTo === p.id ? (
                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '12px', bgcolor: theme.custom.surface.active }}>
                    <Composer
                      placeholder={`Reply to ${p.authorName ?? 'this'}`}
                      submitLabel="Reply"
                      autoFocus
                      onSubmit={(body) => reply(p.id, body)}
                      onCancel={() => setReplyingTo(null)}
                    />
                  </Box>
                ) : (
                  <Button
                    size="small"
                    startIcon={<IconMessageCircle size={15} />}
                    onClick={() => setReplyingTo(p.id)}
                    sx={{ textTransform: 'none', color: 'text.secondary', mt: 0.75, ml: -0.75 }}
                  >
                    Reply
                  </Button>
                )}
              </Entry>
            </Box>
          ))}

          {!exhausted && (
            <Button onClick={() => void older()} disabled={loadingMore} sx={{ textTransform: 'none', fontWeight: 700, justifySelf: 'center' }}>
              {loadingMore ? 'Loading' : 'Show older'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default GroupDiscussionPanel;
