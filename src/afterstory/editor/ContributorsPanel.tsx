/**
 * Story admins: the people writing it alongside its owner.
 *
 * The reason this exists is arithmetic. A group trip already pulled three to six
 * people into the product for the most engaged month of their year, and when it
 * ends exactly one of them has a reason to come back. Shared bylines give the
 * rest one, and every admin is another person whose profile carries the
 * story outward.
 *
 * Invitations are invitations. Someone added here is "invited" until they accept,
 * because a byline on writing you have not read is not a gift.
 */

import React from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconX, IconUserPlus } from '@tabler/icons-react';
import { afterStoryService } from '../afterStoryService';
import { apiServices } from '../../services/APIs/apiServices';
import type { AfterStoryDto } from '../types';
import { STORY_FIELD_SX } from '../storyFormat';

interface ContributorsPanelProps {
  story: AfterStoryDto;
  onChanged: (story: AfterStoryDto) => void;
}

interface Candidate {
  id: number;
  name: string;
  avatar?: string | null;
}

const ContributorsPanel: React.FC<ContributorsPanelProps> = ({ story, onChanged }) => {
  const theme = useTheme();
  const [query, setQuery] = React.useState('');
  const [applied, setApplied] = React.useState('');
  const [options, setOptions] = React.useState<Candidate[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced: the crew search fans out across every public account server side,
  // so a request per keystroke is not free for anyone.
  React.useEffect(() => {
    const t = setTimeout(() => setApplied(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    if (applied.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);

    apiServices
      .getTravelersCrew(undefined, undefined, undefined, false, applied)
      .then((response) => {
        if (cancelled) return;
        const raw = Array.isArray(response.data) ? response.data : [];
        const taken = new Set([story.author?.userId, ...story.contributors.map((c) => c.userId)]);
        setOptions(
          raw
            .map((t: Record<string, unknown>) => ({
              id: Number(t.id ?? t.userId ?? 0),
              name: String(t.name ?? 'Traveller'),
              avatar: (t.profilePicture ?? null) as string | null,
            }))
            .filter((c: Candidate) => c.id > 0 && !taken.has(c.id))
            .slice(0, 8),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applied, story.author?.userId, story.contributors]);

  const add = async (candidate: Candidate) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await afterStoryService.addContributor(story.id, candidate.id));
      setQuery('');
      setOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that person.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: number) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await afterStoryService.removeContributor(story.id, userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that person.');
    } finally {
      setBusy(false);
    }
  };

  // Only the story owner invites, so an admin sees the byline but not the
  // controls. Read from the server rather than compared client side.
  const isAuthor = story.isAuthor;

  return (
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
        Written with
      </Typography>

      {story.contributors.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Was anyone else on this trip? Add them and the story carries both names.
        </Typography>
      )}

      {story.contributors.map((contributor) => (
        <Box key={contributor.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={contributor.profilePicture ?? undefined}
            sx={{ width: 26, height: 26, fontSize: 12, bgcolor: 'primary.main' }}
          >
            {contributor.displayName?.[0] ?? 'T'}
          </Avatar>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {contributor.displayName ?? 'Traveller'}
          </Typography>

          {contributor.status !== 'active' && (
            <Chip
              size="small"
              label={contributor.status === 'declined' ? 'Declined' : 'Invited'}
              sx={{ height: 19, fontSize: 10.5, fontWeight: 600 }}
            />
          )}

          {isAuthor && (
            <Tooltip title="Remove">
              <IconButton
                size="small"
                disabled={busy}
                aria-label={`Remove ${contributor.displayName ?? 'contributor'}`}
                onClick={() => void remove(contributor.userId)}
                sx={{ color: 'text.disabled' }}
              >
                <IconX size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}

      {isAuthor && (
        <Autocomplete
          size="small"
          freeSolo
          options={options}
          loading={searching}
          inputValue={query}
          onInputChange={(_, value) => setQuery(value)}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
          filterOptions={(x) => x}
          onChange={(_, value) => {
            if (value && typeof value !== 'string') void add(value);
          }}
          renderOption={(props, option) => {
            const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
            return (
              <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar src={option.avatar ?? undefined} sx={{ width: 22, height: 22, fontSize: 11 }}>
                  {option.name[0]}
                </Avatar>
                <Typography variant="body2">{option.name}</Typography>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search travellers by name"
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: <IconUserPlus size={15} style={{ marginLeft: 6, marginRight: 2 }} />,
                  endAdornment: (
                    <>
                      {searching ? <CircularProgress size={14} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
              sx={STORY_FIELD_SX}
            />
          )}
        />
      )}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default ContributorsPanel;
