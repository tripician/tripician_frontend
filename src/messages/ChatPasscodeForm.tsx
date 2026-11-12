import React from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useTheme,
} from '@mui/material';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { MIN_PASSCODE_LENGTH, WrongPasscodeError } from './e2ee/chatCrypto';
import { chatEngine } from './e2ee/chatSession';

export type PasscodeMode = 'setup' | 'unlock' | 'reset' | 'change';

const COPY: Record<PasscodeMode, { title: string; body: string; action: string; working: string }> = {
  setup: {
    title: 'Turn on private messages',
    body:
      "Your chats are end-to-end encrypted: only you and the person you're talking to can read them, not even Tripician. "
      + "Choose a chat passcode. You'll need it to read your messages in the app or on another browser, and nobody can reset it for you.",
    action: 'Turn on',
    working: 'Locking your key…',
  },
  unlock: {
    title: 'Enter your chat passcode',
    body: 'Your messages are locked in this browser. Enter the chat passcode you chose to read them here.',
    action: 'Unlock',
    working: 'Unlocking…',
  },
  reset: {
    title: 'Start over with a new passcode',
    body: "Messages sent before now won't open in this browser. Your chats stay, and everything from now on is encrypted with your new passcode.",
    action: 'Start over',
    working: 'Making your new key…',
  },
  change: {
    title: 'Change your chat passcode',
    body: 'Your messages stay as they are. Use the new passcode the next time you sign in on a new phone or browser.',
    action: 'Save passcode',
    working: 'Locking your key…',
  },
};

/**
 * Sets up, unlocks, starts over with, or changes the chat passcode: the same
 * steps and words as the app's `ChatPasscodeForm`.
 */
const ChatPasscodeForm: React.FC<{ mode: PasscodeMode; onDone?: () => void; compact?: boolean }> = ({ mode: initialMode, onDone, compact }) => {
  const theme = useTheme();
  const [mode, setMode] = React.useState<PasscodeMode>(initialMode);
  const [passcode, setPasscode] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);
  const [askReset, setAskReset] = React.useState(false);

  React.useEffect(() => setMode(initialMode), [initialMode]);

  const copy = COPY[mode];
  const choosing = mode !== 'unlock';
  const tooShort = choosing && passcode.length > 0 && passcode.length < MIN_PASSCODE_LENGTH;
  const mismatch = choosing && confirm.length > 0 && confirm !== passcode;
  const canSubmit = !working && passcode.length >= (choosing ? MIN_PASSCODE_LENGTH : 1) && (!choosing || confirm === passcode);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setWorking(true);
    setError(null);
    try {
      if (mode === 'setup') await chatEngine.setUp(passcode);
      else if (mode === 'unlock') await chatEngine.unlock(passcode);
      else if (mode === 'reset') await chatEngine.reset(passcode);
      else await chatEngine.changePasscode(passcode);
      setPasscode('');
      setConfirm('');
      onDone?.();
    } catch (err) {
      setError(err instanceof WrongPasscodeError || err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 440, mx: 'auto', textAlign: 'center', py: compact ? 1 : 4 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: theme.custom.surface.brandTint, color: 'primary.main', display: 'grid', placeItems: 'center', mx: 'auto' }}>
        {mode === 'unlock' ? <IconLockOpen size={28} /> : <IconLock size={28} />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{copy.title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{copy.body}</Typography>

      {/* A username field keeps password managers from pairing this with the account password. */}
      <input type="text" name="username" value="tripician-chat-passcode" autoComplete="username" readOnly hidden />
      <TextField
        label={choosing ? 'New chat passcode' : 'Chat passcode'}
        type="password"
        value={passcode}
        onChange={(e) => { setPasscode(e.target.value); setError(null); }}
        autoComplete={choosing ? 'new-password' : 'current-password'}
        error={tooShort}
        helperText={tooShort ? `At least ${MIN_PASSCODE_LENGTH} characters.` : undefined}
        autoFocus
        fullWidth
      />
      {choosing && (
        <TextField
          label="Type it again"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(null); }}
          autoComplete="new-password"
          error={mismatch}
          helperText={mismatch ? "That doesn't match." : undefined}
          fullWidth
        />
      )}
      {choosing && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'left' }}>
          A short phrase is easier to remember and harder to guess, like three words you&apos;d never put together.
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ textAlign: 'left' }}>{error}</Alert>}

      <Button
        type="submit"
        variant="contained"
        color={mode === 'reset' ? 'error' : 'primary'}
        size="large"
        disabled={!canSubmit}
        startIcon={working ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px' }}
      >
        {working ? copy.working : copy.action}
      </Button>

      {mode === 'unlock' && (
        <Button onClick={() => setAskReset(true)} sx={{ textTransform: 'none', alignSelf: 'center' }}>
          Forgot your passcode?
        </Button>
      )}

      <Dialog open={askReset} onClose={() => setAskReset(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Start over with a new passcode?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nobody can recover a forgotten chat passcode, not even Tripician. If you start over, messages sent before now
            won&apos;t open here. A phone of yours that is still signed in can still read them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskReset(false)} sx={{ textTransform: 'none' }}>Keep trying</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { setAskReset(false); setPasscode(''); setConfirm(''); setError(null); setMode('reset'); }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Start over
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatPasscodeForm;
