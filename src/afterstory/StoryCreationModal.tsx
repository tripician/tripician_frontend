/**
 * Starting a standalone story.
 *
 * Shorter than TripCreationModal on purpose. A trip needs enough detail for a
 * planner to be useful; a story needs a title and somewhere to start typing.
 * Every other field here exists because a story with no place and no date cannot
 * be found by anyone later, not because the editor needs it.
 */

import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { VIBES } from '../pages/CommunityPage/vibes';
import { COUNTRIES } from '../utils/countries';
import { afterStoryService } from './afterStoryService';
import { storyEditPath } from './storySlug';
import { STORY_TEMPLATES, TEMPLATE_ORDER } from './render/templates';
import { STORY_LIMITS } from './types';
import { STORY_FIELD_SX } from './storyFormat';
import type { StoryTemplate } from './types';

interface StoryCreationModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefills when a story is being started from a trip. */
  initial?: {
    tripId?: string;
    title?: string;
    destination?: string;
    countries?: string[];
    travelStartDate?: string | null;
    travelEndDate?: string | null;
    vibe?: string | null;
  };
  /** Overrides the default navigation to the editor. */
  onCreated?: (storyId: string) => void;
}


const StoryCreationModal: React.FC<StoryCreationModalProps> = ({ open, onClose, initial, onCreated }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [title, setTitle] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [countries, setCountries] = React.useState<string[]>([]);
  const [start, setStart] = React.useState<string | null>(null);
  const [end, setEnd] = React.useState<string | null>(null);
  const [vibe, setVibe] = React.useState<string | null>(null);
  const [template, setTemplate] = React.useState<StoryTemplate>('journal');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset on open rather than on close, so the fields do not visibly empty
  // themselves during the closing animation.
  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDestination(initial?.destination ?? '');
    setCountries(initial?.countries ?? []);
    setStart(initial?.travelStartDate ?? null);
    setEnd(initial?.travelEndDate ?? null);
    setVibe(initial?.vibe ?? null);
    setTemplate('journal');
    setError(null);
  }, [open, initial]);

  const canSubmit = title.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const story = await afterStoryService.create({
        title: title.trim(),
        tripId: initial?.tripId ?? null,
        destination: destination.trim() || null,
        countries: countries.length > 0 ? countries : null,
        travelStartDate: start,
        travelEndDate: end,
        vibe,
        template,
      });
      onClose();
      if (onCreated) onCreated(story.id);
      else navigate(storyEditPath(story.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start that story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ pt: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700, mb: 0.5 }}
        >
          Write an after story
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Where you went and what it was actually like. You can change any of this later.
        </Typography>

        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            placeholder="Three days in Kyoto"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, STORY_LIMITS.maxTitleChars))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) {
                e.preventDefault();
                void submit();
              }
            }}
            sx={STORY_FIELD_SX}
          />

          <TextField
            fullWidth
            label="Place"
            placeholder="Kyoto and Osaka"
            value={destination}
            onChange={(e) => setDestination(e.target.value.slice(0, 120))}
            sx={STORY_FIELD_SX}
          />

          <Autocomplete
            multiple
            options={COUNTRIES}
            value={countries}
            onChange={(_, value) => setCountries(value.slice(0, STORY_LIMITS.maxCountries))}
            renderInput={(params) => <TextField {...params} label="Countries" sx={STORY_FIELD_SX} />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...rest } = getTagProps({ index });
                return <Chip key={key} {...rest} size="small" label={option} />;
              })
            }
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <DatePicker
              label="From"
              value={start ? dayjs(start) : null}
              onChange={(value) => setStart(value ? value.format('YYYY-MM-DD') : null)}
              slotProps={{ textField: { sx: STORY_FIELD_SX } }}
            />
            <DatePicker
              label="To"
              value={end ? dayjs(end) : null}
              minDate={start ? dayjs(start) : undefined}
              onChange={(value) => setEnd(value ? value.format('YYYY-MM-DD') : null)}
              slotProps={{ textField: { sx: STORY_FIELD_SX } }}
            />
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Vibe
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {Object.entries(VIBES).map(([key, item]) => {
                const active = vibe === key;
                return (
                  <Box
                    key={key}
                    component="button"
                    type="button"
                    onClick={() => setVibe(active ? null : key)}
                    aria-pressed={active}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.25,
                      py: 0.6,
                      borderRadius: 999,
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${active ? 'transparent' : theme.custom.surface.border}`,
                      bgcolor: active ? 'text.primary' : 'transparent',
                      color: active ? 'background.paper' : 'text.secondary',
                      '&:hover': { bgcolor: active ? 'text.primary' : theme.custom.surface.hover },
                      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                    }}
                  >
                    <item.Icon size={13} />
                    {item.label}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Shape
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1,
              }}
            >
              {TEMPLATE_ORDER.map((key) => {
                const item = STORY_TEMPLATES[key];
                const active = template === key;
                return (
                  <Box
                    key={key}
                    component="button"
                    type="button"
                    onClick={() => setTemplate(key)}
                    aria-pressed={active}
                    sx={{
                      textAlign: 'left',
                      p: 1.5,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      font: 'inherit',
                      border: `1px solid ${active ? theme.palette.primary.main : theme.custom.surface.border}`,
                      bgcolor: active ? theme.custom.surface.brandTint : 'transparent',
                      '&:hover': {
                        bgcolor: active ? theme.custom.surface.brandTint : theme.custom.surface.hover,
                      },
                      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                    }}
                  >
                    <Typography variant="subtitle2">{item.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.description}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {error && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={!canSubmit}>
          {busy ? 'Starting...' : 'Start writing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoryCreationModal;
