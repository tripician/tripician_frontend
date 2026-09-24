/**
 * Pick one of your own published plans or stories to share on the board.
 *
 * Published only, and that is not a filter for tidiness: the server refuses an
 * unpublished one outright, so offering a draft here would be offering something
 * that comes back as an error. A traveller with drafts and nothing published sees
 * why rather than an empty list.
 *
 * Both kinds in one list rather than two tabs. There are rarely many of either,
 * and what somebody wants to share is "that thing I made", not a category.
 */

import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconCheck, IconWorld } from '@tabler/icons-react';
import { useAuthToken } from '../hooks/useAuth0Token';
import { apiServices } from '../services/APIs/apiServices';
import { afterStoryService } from '../afterstory/afterStoryService';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { CARD_TYPES } from '../components/ui/cardTypes';

export interface ShareChoice {
  kind: 'plan' | 'story';
  id: string;
  title: string;
  coverUrl: string | null;
  meta: string | null;
}

interface SharePickerProps {
  value: ShareChoice | null;
  onChange: (choice: ShareChoice | null) => void;
}

const THUMB = 34;

const SharePicker: React.FC<SharePickerProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [choices, setChoices] = React.useState<ShareChoice[] | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      const [trips, stories] = await Promise.all([
        token
          ? apiServices.getDashboardTrips(token)
              .then((r) => (Array.isArray(r.data) ? r.data : r.data?.trips ?? []))
              .catch(() => [])
          : Promise.resolve([]),
        FEATURE_FLAGS.afterStory
          ? afterStoryService.listMine().catch(() => [])
          : Promise.resolve([]),
      ]);
      if (!active) return;

      const planChoices: ShareChoice[] = (trips as any[])
        .filter((t) => (t?.published ?? t?.Published) === true && !(t?.isArchived ?? t?.IsArchived))
        .map((t) => ({
          kind: 'plan' as const,
          id: String(t.id ?? t.Id),
          title: (t.name ?? t.Name ?? '').trim() || 'Untitled trip',
          coverUrl: null,
          meta: Array.isArray(t.countries) && t.countries.length > 0
            ? t.countries.slice(0, 2).join(', ')
            : null,
        }));

      const storyChoices: ShareChoice[] = (stories as any[])
        .filter((s) => String(s?.status ?? '').toLowerCase() === 'published')
        .map((s) => ({
          kind: 'story' as const,
          id: String(s.id),
          title: (s.title ?? '').trim() || 'Untitled story',
          coverUrl: s.coverImageUrl ?? s.coverVideoThumbUrl ?? null,
          meta: s.destination ?? null,
        }));

      setChoices([...planChoices, ...storyChoices]);
    })();

    return () => { active = false; };
  }, [token]);

  if (choices === null) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (choices.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 1.5 }}>
        Nothing published yet. Publish a trip or a story and you can share it here.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 0.25,
        maxHeight: 220,
        overflowY: 'auto',
        // Its own hairline, so the list reads as a panel inside the composer
        // rather than more composer.
        border: `1px solid ${theme.custom.surface.border}`,
        borderRadius: '12px',
        p: 0.5,
        mb: 1,
      }}
    >
      {choices.map((choice) => {
        const spec = CARD_TYPES[choice.kind];
        const selected = value?.kind === choice.kind && value.id === choice.id;

        return (
          <Box
            key={`${choice.kind}-${choice.id}`}
            component="button"
            type="button"
            // Tapping the chosen one again clears it, so there is no separate
            // remove control for a one-of list.
            onClick={() => onChange(selected ? null : choice)}
            aria-pressed={selected}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              width: '100%',
              p: 0.75,
              border: 0,
              borderRadius: '9px',
              bgcolor: selected ? theme.custom.surface.brandTint : 'transparent',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
              '&:hover': { bgcolor: selected ? theme.custom.surface.brandTint : theme.custom.surface.hover },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
            }}
          >
            <Box
              sx={{
                flex: '0 0 auto',
                width: THUMB,
                height: THUMB,
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                bgcolor: theme.custom.surface.active,
                color: 'text.disabled',
              }}
            >
              {choice.coverUrl ? (
                <Box
                  component="img"
                  src={choice.coverUrl}
                  alt=""
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <IconWorld size={15} stroke={1.7} />
              )}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <spec.Icon size={11} stroke={2} />
                <Typography variant="overline" sx={{ lineHeight: 1.2 }}>{spec.label}</Typography>
              </Box>
              <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 600 }}>
                {choice.title}
              </Typography>
            </Box>

            {selected && (
              <Box sx={{ display: 'flex', flexShrink: 0, color: 'primary.main' }}>
                <IconCheck size={16} stroke={2.2} />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default SharePicker;
