/**
 * The planner's After Story section.
 *
 * This is the single component the planner imports from this module. It resolves
 * whether the trip already has a story, offers to start one if not, and
 * otherwise mounts the same editor the standalone route uses.
 *
 * Keeping the whole integration behind one component is what makes the boundary
 * real: TripPlanner.tsx gains one import and one case in its section switch, and
 * nothing else about the planner has to know this feature exists.
 */

import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconBook, IconRefresh } from '@tabler/icons-react';
import AfterStoryEditor from './editor/AfterStoryEditor';
import StoryCreationModal from './StoryCreationModal';
import { afterStoryService } from './afterStoryService';
import type { AfterStoryDto } from './types';

interface AfterStoryPanelProps {
  tripId: string;
  /** Prefills the creation modal so the author does not retype what the trip knows. */
  tripName?: string;
  destination?: string;
  countries?: string[];
  startDate?: string | null;
  endDate?: string | null;
  vibe?: string | null;
}

const AfterStoryPanel: React.FC<AfterStoryPanelProps> = ({
  tripId,
  tripName,
  destination,
  countries,
  startDate,
  endDate,
  vibe,
}) => {
  const theme = useTheme();
  const [story, setStory] = React.useState<AfterStoryDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStory(await afterStoryService.getForTrip(tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this trip’s story.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', gap: 1.5, minHeight: 260, textAlign: 'center', px: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {error}
        </Typography>
        <Button size="small" startIcon={<IconRefresh size={14} />} onClick={() => void load()}>
          Try again
        </Button>
      </Box>
    );
  }

  if (story) {
    return <AfterStoryEditor storyId={story.id} embedded />;
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          gap: 1.5,
          minHeight: 320,
          textAlign: 'center',
          px: 3,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 68,
            height: 68,
            borderRadius: '22px',
            color: 'primary.main',
            backgroundImage: theme.custom.gradients.brandSubtle,
          }}
        >
          <IconBook size={26} />
        </Box>

        <Typography variant="h5" sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700 }}>
          The part that happens after
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
          Write what the trip was actually like: what you would do again, what you would skip, and the photos
          worth keeping. The plan you already made gives it a starting shape, so you are never staring at an
          empty page.
        </Typography>

        <Button variant="contained" onClick={() => setCreating(true)} sx={{ mt: 1 }}>
          Start the story
        </Button>
      </Box>

      <StoryCreationModal
        open={creating}
        onClose={() => setCreating(false)}
        initial={{
          tripId,
          title: tripName,
          destination,
          countries,
          travelStartDate: startDate ?? null,
          travelEndDate: endDate ?? null,
          vibe: vibe ?? null,
        }}
        // Stay in the planner rather than navigating away: the author asked for
        // the After Story tab, not for a different page.
        onCreated={() => void load()}
      />
    </>
  );
};

export default AfterStoryPanel;
