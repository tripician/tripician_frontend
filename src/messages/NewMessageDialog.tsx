import React from 'react';
import { Avatar, Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography, useTheme } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import SearchField from '../components/ui/SearchField';
import { apiFailure, chatApi, type ChatPersonResult, type ChatTarget } from './chatApi';

const DEBOUNCE_MS = 250;

/**
 * Find someone to message: people you last talked to and people you follow
 * first, then anyone by name. Says up front when a first message goes as a
 * request, and who isn't taking messages.
 */
const NewMessageDialog: React.FC<{ open: boolean; onClose: () => void; onPick: (target: ChatTarget) => void }> = ({ open, onClose, onPick }) => {
  const theme = useTheme();
  const [query, setQuery] = React.useState('');
  const [people, setPeople] = React.useState<ChatPersonResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    let live = true;
    const q = query.trim();
    setLoading(true);
    const timer = window.setTimeout(() => {
      chatApi.people(q.length >= 2 ? q : '')
        .then(({ data }) => { if (live) { setPeople(Array.isArray(data) ? data : []); setError(null); } })
        .catch((e) => live && setError(apiFailure(e, 'Could not search right now.').message))
        .finally(() => live && setLoading(false));
    }, q ? DEBOUNCE_MS : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query, open]);

  const searching = query.trim().length >= 2;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px', height: 'min(560px, 85vh)' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, pb: 1 }}>
        <Box sx={{ flex: 1 }}>New message</Box>
        <IconButton aria-label="Close" onClick={onClose}><IconX size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
        <SearchField value={query} onChange={setQuery} placeholder="Search people" autoFocus onClear={() => setQuery('')} />
        <Typography variant="overline" sx={{ color: 'text.secondary', mt: 1 }}>{searching ? 'People' : 'Suggested'}</Typography>
        <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading && !people.length ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={22} /></Box>
          ) : error ? (
            <Typography variant="body2" sx={{ color: 'error.main', py: 2 }}>{error}</Typography>
          ) : !people.length ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
              {searching ? 'Nobody found. Check the spelling, or try their full name.' : 'Type at least two letters of a name.'}
            </Typography>
          ) : (
            people.map((p) => {
              const disabled = !p.acceptingMessages && !p.conversationId;
              const note = !p.acceptingMessages ? 'Not accepting messages'
                : p.conversationId ? 'Open your chat'
                  : p.followsYou ? 'Follows you'
                    : p.needsRequest ? 'Your first message goes as a request' : 'Travelled with you';
              return (
                <Box
                  key={p.userId}
                  component="button"
                  type="button"
                  disabled={disabled}
                  onClick={() => { onPick({ conversationId: p.conversationId, userId: p.userId, name: p.name, avatarUrl: p.avatarUrl }); onClose(); }}
                  sx={{
                    display: 'flex', gap: 1.5, alignItems: 'center', width: '100%', textAlign: 'left',
                    border: 'none', bgcolor: 'transparent', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', color: 'inherit',
                    px: 1, py: 1, borderRadius: '12px', opacity: disabled ? 0.45 : 1,
                    '&:hover': { bgcolor: disabled ? 'transparent' : theme.custom.surface.hover },
                  }}
                >
                  <Avatar src={p.avatarUrl ?? undefined} sx={{ width: 44, height: 44 }}>{(p.name ?? '?').charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{p.name ?? 'Traveller'}</Typography>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>{note}</Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageDialog;
