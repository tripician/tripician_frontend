import React from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogContent, Typography } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import ChatPasscodeForm from './ChatPasscodeForm';
import { chatEngine, useChatKeyStatus } from './e2ee/chatSession';

/** Privacy settings: the chat passcode, to turn on, unlock in this browser, or change. */
const ChatPasscodeCard: React.FC<{ sx?: object }> = ({ sx }) => {
  const status = useChatKeyStatus();
  const me = Number(useSelector((state: RootState) => state.user.profile?.id));
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (Number.isFinite(me) && me > 0) void chatEngine.init(me);
  }, [me]);

  const mode = status.kind === 'ready' ? 'change' : status.kind === 'setup' ? 'setup' : 'unlock';
  const copy = {
    change: { text: 'Your messages are end-to-end encrypted. The passcode unlocks them on a new phone or browser.', action: 'Change passcode' },
    setup: { text: 'Turn on private, end-to-end encrypted messages. Nobody else can read them, not even Tripician.', action: 'Turn on' },
    unlock: { text: 'Your messages are locked in this browser. Enter your chat passcode to read them here.', action: 'Unlock' },
  }[mode];

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconLock size={18} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Chat passcode</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{copy.text}</Typography>
        <Button variant="outlined" onClick={() => setOpen(true)} disabled={status.kind === 'loading' || status.kind === 'idle'} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {copy.action}
        </Button>
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <ChatPasscodeForm mode={mode} compact onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ChatPasscodeCard;
