/**
 * The live save state of an editing surface, as one line of text.
 *
 * This is the whole reason a surface can drop its Save button: the button was
 * never really a control, it was the only place the app admitted whether your
 * work was safe. Say that continuously instead and the button has no job left.
 *
 * Lifted out of `afterstory/editor/AfterStoryEditor` when the trip planner
 * adopted the same model. Deliberately text and not a chip or a toast - it sits
 * in a header and must be readable at a glance without ever demanding one.
 *
 * `conflict` only fires on a surface that carries a version number and can be
 * told its copy is stale. The planner has no such field, so it simply never
 * enters that branch; that is expected, not a gap.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface SaveIndicatorProps {
  state: SaveState;
  /** Null until the first successful write of this session. */
  lastSavedAt: Date | null;
  /** Shown verbatim in the `error` and `conflict` states when present. */
  error?: string | null;
  /** Retry the write. Only reachable from the `error` state. */
  onRetry?: () => void;
}

/** A text button that inherits the surrounding caption's type. */
const InlineAction: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{ border: 0, bgcolor: 'transparent', p: 0, font: 'inherit', color: 'primary.main', cursor: 'pointer' }}
  >
    {children}
  </Box>
);

const SaveIndicator: React.FC<SaveIndicatorProps> = ({ state, lastSavedAt, error, onRetry }) => {
  if (state === 'conflict') {
    return (
      <Typography variant="caption" sx={{ color: 'warning.main' }}>
        {error ?? 'This changed somewhere else.'}{' '}
        <InlineAction onClick={() => window.location.reload()}>Reload</InlineAction>
      </Typography>
    );
  }

  if (state === 'error') {
    return (
      <Typography variant="caption" sx={{ color: 'error.main' }}>
        {error ?? 'Could not save.'}
        {onRetry && <> <InlineAction onClick={onRetry}>Try again</InlineAction></>}
      </Typography>
    );
  }

  const label =
    state === 'saving'
      ? 'Saving...'
      : state === 'dirty'
        ? 'Unsaved changes'
        : lastSavedAt
          ? `Saved ${dayjs(lastSavedAt).format('HH:mm')}`
          : 'Saved';

  return (
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
  );
};

export default SaveIndicator;
