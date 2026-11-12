import React from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography, useTheme } from '@mui/material';
import { IconLock, IconMapPin, IconX } from '@tabler/icons-react';
import { accuracyText, placeMapUrl, type PreparedPhoto } from './chatMedia';
import { MAX_MESSAGE_LENGTH, type LocationRef } from './e2ee/chatCrypto';

export type SendDraft = { kind: 'photo'; photo: PreparedPhoto } | { kind: 'location'; location: LocationRef };

/**
 * One look before a photo or a place goes: the picture (or a map of where the
 * browser thinks it is, and how sure it is), a line to add, and Send. The same
 * as the app's `ChatSendPreview`.
 */
const ChatSendDialog: React.FC<{
  draft: SendDraft | null;
  to: string;
  onSend: (draft: SendDraft, caption: string) => void;
  onClose: () => void;
}> = ({ draft, to, onSend, onClose }) => {
  const theme = useTheme();
  const [caption, setCaption] = React.useState('');
  const [mapFailed, setMapFailed] = React.useState(false);

  React.useEffect(() => {
    if (draft) {
      setCaption('');
      setMapFailed(false);
    }
  }, [draft]);

  const isPhoto = draft?.kind === 'photo';
  const map = draft?.kind === 'location' ? placeMapUrl(draft.location, 560, 320) : null;
  const precision = draft?.kind === 'location' ? accuracyText(draft.location.acc) : null;
  const submit = () => draft && onSend(draft, caption);

  return (
    <Dialog open={!!draft} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, pb: 1 }}>
        <Box sx={{ flex: 1 }}>{isPhoto ? 'Send photo' : 'Share your location'}</Box>
        <IconButton aria-label="Cancel" onClick={onClose}><IconX size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ borderRadius: '14px', overflow: 'hidden', bgcolor: theme.custom.surface.active, display: 'grid', placeItems: 'center', maxHeight: 420 }}>
          {draft?.kind === 'photo' ? (
            <Box component="img" src={draft.photo.previewUrl} alt="The photo to send" sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />
          ) : map && !mapFailed ? (
            <Box component="img" src={map} alt="Map of your location" onError={() => setMapFailed(true)} sx={{ width: '100%', display: 'block' }} />
          ) : (
            <Box sx={{ py: 6 }}><IconMapPin size={40} color={theme.palette.primary.main} /></Box>
          )}
        </Box>
        {precision && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {precision}
            {draft?.kind === 'location' && draft.location.acc != null && draft.location.acc > 1500
              ? '. Your browser only gave a rough position.'
              : ''}
          </Typography>
        )}
        <TextField
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder={isPhoto ? 'Add a caption…' : 'Add a note, like "meet me here"…'}
          multiline
          maxRows={4}
          size="small"
          autoFocus
          inputProps={{ 'aria-label': isPhoto ? 'Caption' : 'Note', maxLength: MAX_MESSAGE_LENGTH }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '18px' } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconLock size={13} />
          <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
            Only {to} can see {isPhoto ? 'this photo' : 'where you are'}: it&apos;s end-to-end encrypted.
          </Typography>
          <Button variant="contained" onClick={submit} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: 3 }}>
            Send
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ChatSendDialog;
