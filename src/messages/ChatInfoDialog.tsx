import React from 'react';
import { Avatar, Box, Button, Dialog, DialogContent, Typography, useTheme } from '@mui/material';
import { IconFlag, IconLock, IconTrash, IconUserCancel, IconUserCheck } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import { firstName, type ChatSummary } from './chatApi';
import { fromBase64, safetyCode } from './e2ee/chatCrypto';
import { chatEngine } from './e2ee/chatSession';

/**
 * About a chat: who it's with, its security code (how two people check that
 * nobody swapped a key between them), and delete, block, report.
 */
const ChatInfoDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  chat: ChatSummary | null;
  meUserId: number;
  onDelete: () => void;
  onToggleBlock: () => void;
  onReport: () => void;
}> = ({ open, onClose, chat, meUserId, onDelete, onToggleBlock, onReport }) => {
  const theme = useTheme();
  const first = firstName(chat?.other.name) || 'them';
  const blocked = chat?.blocker === 'blocked';

  const code = React.useMemo(() => {
    const mine = chatEngine.myPublicKey();
    if (!open || !chat?.otherKey || !mine) return null;
    return safetyCode({ userId: meUserId, publicKey: mine }, { userId: chat.other.userId, publicKey: fromBase64(chat.otherKey.publicKey) });
  }, [open, chat, meUserId]);
  const groups = code?.split(' ') ?? [];

  const action = (Icon: React.ElementType, label: string, onClick: () => void, danger = false) => (
    <Button
      onClick={onClick}
      startIcon={<Icon size={18} />}
      color={danger ? 'error' : 'inherit'}
      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, py: 1.25, px: 1.5 }}
      fullWidth
    >
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar src={chat?.other.avatarUrl ?? undefined} sx={{ width: 72, height: 72, mx: 'auto', mb: 1 }}>
            {(chat?.other.name ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{chat?.other.name ?? 'Traveller'}</Typography>
          {chat?.otherFollowsMe && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Follows you</Typography>}
          {chat && (
            <Box sx={{ mt: 1 }}>
              <Button component={RouterLink} to={`/traveler/${chat.other.userId}`} onClick={onClose} variant="outlined" size="small" sx={{ textTransform: 'none', borderRadius: '999px' }}>
                View profile
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ bgcolor: theme.custom.surface.hover, borderRadius: '14px', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'primary.main' }}>
            <IconLock size={16} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>End-to-end encrypted</Typography>
          </Box>
          {code ? (
            <>
              <Box aria-label={`Security code ${code}`} sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em', textAlign: 'center', my: 1, lineHeight: 1.8 }}>
                {[0, 4, 8].map((start) => (
                  <Typography key={start} variant="body1" sx={{ fontWeight: 600 }}>{groups.slice(start, start + 4).join('  ')}</Typography>
                ))}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Compare this code with {first}&apos;s, in person or on a call. If it matches, nobody is listening in. It changes when
                either of you starts over with a new chat passcode.
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {chat?.otherKey ? 'Unlock your messages to see the security code for this chat.' : `${first} hasn't turned on private messages yet.`}
            </Typography>
          )}
        </Box>

        <Box>
          {chat?.id && action(IconTrash, 'Delete chat', onDelete)}
          {action(blocked ? IconUserCheck : IconUserCancel, blocked ? `Unblock ${first}` : `Block ${first}`, onToggleBlock, !blocked)}
          {chat?.id && action(IconFlag, 'Report', onReport, true)}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ChatInfoDialog;
