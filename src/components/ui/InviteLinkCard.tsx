import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconCheck, IconCopy, IconLink, IconRefresh } from '@tabler/icons-react';

interface InviteLinkCardProps {
  /** One sentence on what holding the link lets somebody do. */
  description: string;
  load: () => Promise<string | null>;
  rotate: () => Promise<string | null>;
  revoke: () => Promise<void>;
  linkFor: (token: string) => string;
  /** Who the link is for, shown on the off switch's confirm. */
  noun: string;
}

// An invite link the owner can copy, replace or switch off. Shared by groups and trips so both behave the same.
const InviteLinkCard: React.FC<InviteLinkCardProps> = ({ description, load, rotate, revoke, linkFor, noun }) => {
  const theme = useTheme();
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    load()
      .then((t) => { if (active) setToken(t); })
      .catch(() => { if (active) setToken(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const link = token ? linkFor(token) : null;

  const makeNew = async () => {
    setBusy(true);
    setError(null);
    try {
      setToken(await rotate());
      setCopied(false);
    } catch {
      setError('The link could not be made. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!window.confirm(`Turn the invite link off? Anyone holding the old link will no longer be able to join the ${noun} with it.`)) return;
    setBusy(true);
    try {
      await revoke();
      setToken(null);
    } catch {
      setError('The link could not be turned off. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError('Copy failed. Select the link and copy it by hand.');
    }
  };

  return (
    <Box sx={{ p: 2, borderRadius: '16px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconLink size={16} /> Invite link
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{description}</Typography>

      {!loading && (
        link ? (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box
              component="input"
              readOnly
              value={link}
              aria-label="Invite link"
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
              sx={{
                flex: '1 1 240px', minWidth: 0, height: 38, px: 1.5, borderRadius: '10px',
                border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.default',
                color: 'text.primary', font: 'inherit', typography: 'body2',
              }}
            />
            <Button variant="contained" onClick={() => void copy()} startIcon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={() => void makeNew()} disabled={busy} startIcon={<IconRefresh size={16} />} sx={{ textTransform: 'none' }}>
              New link
            </Button>
            <Button onClick={() => void turnOff()} disabled={busy} sx={{ textTransform: 'none', color: 'text.secondary' }}>
              Turn off
            </Button>
          </Box>
        ) : (
          <Button variant="outlined" onClick={() => void makeNew()} disabled={busy} startIcon={<IconLink size={16} />} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}>
            Create an invite link
          </Button>
        )
      )}
      {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
    </Box>
  );
};

export default InviteLinkCard;
