import React from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, Typography,
} from '@mui/material';

export const DIDIT_PRIVACY_NOTICE_URL = 'https://didit.me/terms/verification-privacy-notice';
export const DIDIT_BIOMETRIC_POLICY_URL = 'https://didit.me/terms/biometric-data-policy';

const PARAGRAPHS = [
  "The check is run by Didit, our verification partner. You'll photograph an official ID (passport, national ID card or driving licence) and take a selfie. Didit compares your face with the photo on your ID, which uses biometric data: a map of your facial features.",
  'Didit uses it only to confirm your identity for Tripician, and keeps and deletes it as its privacy notice and biometric data policy set out. Tripician never receives your ID images or face data: we keep only whether the check passed, and when.',
  'Verifying is optional. You can use Tripician without it, apart from trips whose hosts ask for verified travellers.',
];

const CONSENT_LABEL =
  'I agree to Didit collecting and using my ID document and biometric face data to verify my identity, as described above.';

interface Props {
  open: boolean;
  onAgree: () => void;
  onClose: () => void;
}

/**
 * What a person must be told, and agree to, before the identity check collects
 * their ID photo and face data.
 *
 * Didit compares a selfie with the photo on an ID: biometric data under Illinois
 * BIPA, Texas, Washington and Colorado law, and special-category data under GDPR.
 * Those require saying who collects it, what for and for how long, and getting
 * written consent (a tick counts) first. The backend refuses a start without
 * `consent: true`. Kept in step with the app's notice
 * (tripician_mobile/src/features/identity/biometricNotice.ts).
 */
const VerificationConsentDialog: React.FC<Props> = ({ open, onAgree, onClose }) => {
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  return (
    // Opened from buttons inside clickable cards, so clicks must not bubble out of it.
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ fontWeight: 700 }}>Before you verify your identity</DialogTitle>
      <DialogContent>
        {PARAGRAPHS.map((text) => (
          <Typography key={text} variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {text}
          </Typography>
        ))}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
          <Link href={DIDIT_PRIVACY_NOTICE_URL} target="_blank" rel="noopener noreferrer" variant="body2">
            Didit privacy notice
          </Link>
          <Link href={DIDIT_BIOMETRIC_POLICY_URL} target="_blank" rel="noopener noreferrer" variant="body2">
            Biometric data policy
          </Link>
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
          label={<Typography variant="body2">{CONSENT_LABEL}</Typography>}
          sx={{ alignItems: 'flex-start', mr: 0, '& .MuiCheckbox-root': { pt: 0.25 } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" disabled={!agreed} onClick={onAgree}>
          Agree and continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerificationConsentDialog;
