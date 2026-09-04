/**
 * Who can read this story, and the plan attached to it.
 *
 * Three states, not a switch: Draft, Unlisted and Published are genuinely
 * different promises, and collapsing them into "public: yes/no" would lose the
 * one people actually want, which is sending a link to family without it turning
 * up in search.
 *
 * Publishing is deliberately not one tap. The button explains what will happen
 * first, because a story is written for people who know the author and then
 * accidentally read by strangers, which is the regret this feature can cause.
 */

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconWorld,
  IconLink,
  IconLock,
  IconExternalLink,
  IconRoute,
  IconX,
} from '@tabler/icons-react';
import { AfterStoryError } from '../afterStoryService';
// Statically imported: apiServices is already in the main bundle via the story
// service, so the lazy import this replaced deferred nothing and only added an
// async path with its own failure mode.
import { apiServices } from '../../services/APIs/apiServices';
import { storyPath } from '../storySlug';
import { SITE_URL } from '../../components/Seo';
import { isBlockEmpty } from '../blockSchema';
import type { AfterStoryDto, StoryBlock, StoryStatus } from '../types';

interface PublishBarProps {
  story: AfterStoryDto;
  blocks: StoryBlock[];
  onStatusChange: (status: StoryStatus) => Promise<void>;
  onAttachTrip: (tripId: string | null) => Promise<void>;
}

const STATUS_META: Record<Exclude<StoryStatus, 'Removed'>, { label: string; hint: string; Icon: React.ElementType }> = {
  Draft: { label: 'Private draft', hint: 'Only you can see this.', Icon: IconLock },
  Unlisted: { label: 'Anyone with the link', hint: 'Not listed anywhere, and kept out of search.', Icon: IconLink },
  Published: { label: 'Public', hint: 'Anyone can find and read this.', Icon: IconWorld },
};

const PublishBar: React.FC<PublishBarProps> = ({ story, blocks, onStatusChange, onAttachTrip }) => {
  const theme = useTheme();
  const [confirming, setConfirming] = React.useState<StoryStatus | null>(null);
  const [attaching, setAttaching] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const written = blocks.filter((b) => !isBlockEmpty(b)).length;
  const readyToShare = written > 0;
  const publicUrl = `${SITE_URL}${storyPath(story)}`;

  const apply = async (status: StoryStatus) => {
    setBusy(true);
    setError(null);
    try {
      await onStatusChange(status);
      setToast(
        status === 'Published'
          ? 'Your story is live.'
          : status === 'Unlisted'
            ? 'Anyone with the link can read it now.'
            : 'Back to a private draft.',
      );
      setConfirming(null);
    } catch (err) {
      setError(err instanceof AfterStoryError ? err.message : 'Could not change that.');
    } finally {
      setBusy(false);
    }
  };

  if (story.status === 'Removed') {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: '16px',
          border: `1px solid ${theme.palette.warning.main}`,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: 'warning.main' }}>
          Taken down
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          A moderator removed this story. You can still edit it, but it cannot be published from here.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          p: 2,
          display: 'grid',
          gap: 1.5,
          borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Who can read this
        </Typography>

        <Select
          size="small"
          value={story.status}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as StoryStatus;
            if (next === story.status) return;
            // Going more public is the one that needs a beat of thought. Going
            // more private is always safe, so it just happens.
            if (next === 'Published' || next === 'Unlisted') setConfirming(next);
            else void apply(next);
          }}
          sx={{ borderRadius: '12px' }}
          renderValue={(value) => {
            const meta = STATUS_META[value as Exclude<StoryStatus, 'Removed'>] ?? STATUS_META.Draft;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <meta.Icon size={15} />
                {meta.label}
              </Box>
            );
          }}
        >
          {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => {
            const meta = STATUS_META[key];
            return (
              <MenuItem key={key} value={key} disabled={key !== 'Draft' && !readyToShare}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <meta.Icon size={15} />
                    <Typography variant="body2">{meta.label}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {meta.hint}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Select>

        {!readyToShare && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Write something before you share it.
          </Typography>
        )}

        {story.status !== 'Draft' && story.slug && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              fullWidth
              value={publicUrl}
              slotProps={{ input: { readOnly: true, sx: { fontSize: 12, borderRadius: '12px' } } }}
              onFocus={(e) => e.target.select()}
            />
            <Tooltip title="Open">
              <IconButton
                size="small"
                component="a"
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the public story"
              >
                <IconExternalLink size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ borderTop: `1px solid ${theme.custom.surface.border}`, pt: 1.5, mt: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            The plan behind it
          </Typography>

          {story.tripId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconRoute size={15} style={{ color: theme.palette.primary.main, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                {story.tripIsPublished
                  ? 'Readers can open the plan.'
                  : 'Attached, but the trip is not published so readers will not see it.'}
              </Typography>
              <Tooltip title="Detach">
                <IconButton
                  size="small"
                  disabled={busy}
                  aria-label="Detach the trip"
                  onClick={() => void onAttachTrip(null)}
                >
                  <IconX size={15} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                Attach one of your trips and readers get a plan they can copy.
              </Typography>
              <Button size="small" onClick={() => setAttaching(true)} disabled={busy}>
                Attach a trip
              </Button>
            </>
          )}
        </Box>

        {error && (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}
      </Box>

      <Dialog open={Boolean(confirming)} onClose={busy ? undefined : () => setConfirming(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700 }}>
          {confirming === 'Published' ? 'Make this public?' : 'Share by link?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {confirming === 'Published'
              ? 'Anyone will be able to find and read it, including from a search engine, and your name will be on it. You can set it back to private at any time.'
              : 'Anyone you send the link to can read it. It stays out of search and off the community pages.'}
          </Typography>
          {confirming === 'Published' && !story.slug && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
              Its web address is set now and will not change, even if you rename the story later.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setConfirming(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => confirming && void apply(confirming)} disabled={busy}>
            {busy ? 'Working...' : confirming === 'Published' ? 'Publish' : 'Share by link'}
          </Button>
        </DialogActions>
      </Dialog>

      <AttachTripDialog
        open={attaching}
        onClose={() => setAttaching(false)}
        onAttach={async (tripId) => {
          await onAttachTrip(tripId);
          setAttaching(false);
          setToast('Trip attached.');
        }}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

/**
 * Picks from the trips the caller can actually use. The server re-checks
 * membership on attach, so this list is a convenience rather than the control.
 */
const AttachTripDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onAttach: (tripId: string) => Promise<void>;
}> = ({ open, onClose, onAttach }) => {
  const theme = useTheme();
  const [trips, setTrips] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    apiServices
      .getDashboardTrips('')
      .then((response) => {
        if (cancelled) return;
        const raw = Array.isArray(response.data) ? response.data : [];
        setTrips(
          raw
            .map((t: Record<string, unknown>) => ({
              id: String(t.id ?? t.Id ?? ''),
              name: String(t.name ?? t.Name ?? 'Untitled trip'),
            }))
            .filter((t) => t.id.length > 0),
        );
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your trips.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700 }}>Attach a trip</DialogTitle>
      <DialogContent>
        {loading && <Typography variant="body2">Loading your trips...</Typography>}
        {error && (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}
        {!loading && !error && trips.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            You do not have any trips yet.
          </Typography>
        )}
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          {trips.map((trip) => (
            <Box
              key={trip.id}
              component="button"
              type="button"
              onClick={() => void onAttach(trip.id)}
              sx={{
                textAlign: 'left',
                p: 1.25,
                border: 0,
                borderRadius: '10px',
                bgcolor: 'transparent',
                font: 'inherit',
                cursor: 'pointer',
                color: 'text.primary',
                '&:hover': { bgcolor: theme.custom.surface.hover },
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
              }}
            >
              <Typography variant="body2">{trip.name}</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublishBar;
