/**
 * Navia's proof-reading pass, shown for approval.
 *
 * Two things this deliberately does not do. It does not write anything: the
 * options are a grammar fix and a rephrase of what the author already wrote,
 * and there is no "write this for me". And it never applies its own result.
 * The suggestion sits beside the original until someone chooses.
 *
 * That is the same posture as the rest of the product, where a generated place
 * is labelled unchecked rather than presented as fact. A travel story is a
 * first-hand account, so a sentence the author did not approve is worth less
 * than a typo.
 */

import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Popover,
  Typography,
  useTheme,
} from '@mui/material';
import { IconCheck, IconX, IconSparkles } from '@tabler/icons-react';
import NaviaOrb from '../../navia/NaviaOrb';
import { afterStoryService, AfterStoryError } from '../afterStoryService';
import { stripHtml } from '../blockSchema';

interface PolishPopoverProps {
  anchorEl: HTMLElement | null;
  /** Current block html. Only its text is sent; formatting never leaves the client. */
  html: string;
  onClose: () => void;
  onAccept: (text: string) => void;
}

type Mode = 'grammar' | 'rephrase';

const PolishPopover: React.FC<PolishPopoverProps> = ({ anchorEl, html, onClose, onAccept }) => {
  const theme = useTheme();
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<Mode | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [unchanged, setUnchanged] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const original = React.useMemo(() => stripHtml(html), [html]);

  React.useEffect(() => {
    if (anchorEl) return;
    // Reset on close, not on open, so the panel does not visibly empty itself
    // during the closing animation.
    setMode(null);
    setResult(null);
    setUnchanged(false);
    setError(null);
  }, [anchorEl]);

  const run = async (next: Mode) => {
    setBusy(true);
    setMode(next);
    setError(null);
    setResult(null);
    setUnchanged(false);

    try {
      const polished = await afterStoryService.polish(original, next);
      if (!polished.changed) setUnchanged(true);
      else setResult(polished.text);
    } catch (err) {
      setError(err instanceof AfterStoryError ? err.message : 'Navia could not check that passage.');
    } finally {
      setBusy(false);
    }
  };

  const tooShort = original.trim().length < 12;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: { width: { xs: 320, sm: 460 }, p: 2, borderRadius: '16px' } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <NaviaOrb size={14} processing={busy} />
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Navia checks your writing
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        It fixes what you wrote. It never writes for you, and nothing changes until you say so.
      </Typography>

      {tooShort ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Write a sentence or two first.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button
              size="small"
              variant={mode === 'grammar' ? 'contained' : 'outlined'}
              disabled={busy}
              onClick={() => void run('grammar')}
            >
              Fix mistakes
            </Button>
            <Button
              size="small"
              variant={mode === 'rephrase' ? 'contained' : 'outlined'}
              disabled={busy}
              onClick={() => void run('rephrase')}
              startIcon={<IconSparkles size={14} />}
            >
              Improve flow
            </Button>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
              1 credit
            </Typography>
          </Box>

          {busy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Reading it back...
              </Typography>
            </Box>
          )}

          {error && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}

          {unchanged && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 1 }}>
              <IconCheck size={16} style={{ color: theme.palette.success.main }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Nothing to fix. It reads fine as it is.
              </Typography>
            </Box>
          )}

          {result && (
            <>
              {/* Side by side rather than an inline diff. A word-level diff of
                  prose is harder to read than the two versions, and the choice
                  here is "do I prefer this", not "what exactly moved". */}
              <Box sx={{ display: 'grid', gap: 1.25, maxHeight: 260, overflowY: 'auto', mb: 1.5 }}>
                <Panel label="Yours" text={original} muted />
                <Panel label="Navia's suggestion" text={result} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<IconCheck size={15} />}
                  onClick={() => {
                    onAccept(result);
                    onClose();
                  }}
                >
                  Use this
                </Button>
                <Button size="small" color="inherit" startIcon={<IconX size={15} />} onClick={onClose}>
                  Keep mine
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Popover>
  );
};

const Panel: React.FC<{ label: string; text: string; muted?: boolean }> = ({ label, text, muted }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: '12px',
        border: `1px solid ${muted ? theme.custom.surface.border : theme.palette.primary.main}`,
        bgcolor: muted ? 'transparent' : theme.custom.surface.brandTint,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
        {text}
      </Typography>
    </Box>
  );
};

export default PolishPopover;
