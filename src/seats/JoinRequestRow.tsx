/**
 * One applicant, and the decision.
 *
 * Extracted so the trip's own page and the cross-trip inbox cannot drift into
 * showing different things about the same person - the note they wrote being the
 * one that matters, since it is the whole basis for the decision.
 *
 * Presentational on purpose: it owns no fetching and no busy state. Approve and
 * decline are single explicit actions on a named person, and there is
 * deliberately no bulk variant anywhere above it - the safety argument for this
 * feature is that a human looked at each applicant, and a button that waves six
 * strangers through at once removes exactly that.
 */

import React from 'react';
import { Avatar, Box, Button, Typography, useTheme } from '@mui/material';
import MessageButton from '../messages/MessageButton';
import type { TripJoinRequest } from './types';

interface JoinRequestRowProps {
  request: TripJoinRequest;
  busy?: boolean;
  onDecide: (userId: number, approve: boolean) => void;
  /**
   * Enables the Message button. Optional because the row is also rendered where
   * the trip is not to hand, and a button that cannot know its trip is worse
   * than no button.
   */
  tripId?: string;
  /** Shown above the name when the row is out of its trip's context. */
  tripName?: string;
}

const JoinRequestRow: React.FC<JoinRequestRowProps> = ({ request: r, busy = false, onDecide, tripName, tripId }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.75,
        p: 2, borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
      }}
    >
      <Avatar src={r.profilePicture ?? undefined} sx={{ width: 44, height: 44, bgcolor: 'primary.main' }}>
        {r.name?.charAt(0)?.toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        {tripName && (
          <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', lineHeight: 1.4 }}>
            {tripName}
          </Typography>
        )}

        <Typography variant="subtitle1" noWrap sx={{ color: 'text.primary' }}>
          {r.name}
        </Typography>

        {r.location && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            {r.location}
          </Typography>
        )}

        {/* Plain text child, so React escapes it. This is another person's words
            rendered to the organiser, and it must never become markup. */}
        {r.message && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, whiteSpace: 'pre-line' }}>
            {r.message}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <Button size="small" variant="contained" disabled={busy} onClick={() => onDecide(r.userId, true)}>
            Approve
          </Button>
          <Button size="small" color="inherit" disabled={busy} onClick={() => onDecide(r.userId, false)}>
            Decline
          </Button>
          {/* Approve or decline are irreversible for the applicant; asking a
              question first is the option that was missing. It renders only if
              the server agrees the pair may talk. */}
          {tripId && <MessageButton tripId={tripId} userId={r.userId} />}
        </Box>
      </Box>
    </Box>
  );
};

export default JoinRequestRow;
