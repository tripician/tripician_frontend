import React from 'react';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import type { PresentTraveller } from './usePlanPresence';

interface PlanPresenceProps {
  travellers: PresentTraveller[];
  /** Dropped from the list. You are not somebody else's warning. */
  myUserId: number | null;
}

const SHOWN = 3;

/**
 * The other people who have this trip open.
 *
 * Renders nothing when you are alone, which is almost always. It is a warning,
 * and a warning that is always on screen stops being one.
 *
 * Deliberately just faces and a name. The planner saves the whole plan on a
 * timer, so the useful message is "somebody else is in here" and the useful
 * response is to say something to them; a lock or a merge would be promising
 * more than the save path can currently keep.
 */
const PlanPresence: React.FC<PlanPresenceProps> = ({ travellers, myUserId }) => {
  const theme = useTheme();
  const others = travellers.filter((t) => t.userId !== myUserId);
  if (others.length === 0) return null;

  const names = others.map((o) => o.name).filter(Boolean);
  const label = names.length === 1
    ? `${names[0]} also has this trip open`
    : `${names.length} others have this trip open`;

  return (
    <Tooltip title={`${label}. Saving replaces the whole plan, so talk before you both edit.`} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ display: 'inline-flex' }}>
          {others.slice(0, SHOWN).map((o, i) => (
            <Avatar
              key={o.userId}
              src={o.avatarUrl ?? undefined}
              sx={{
                width: 22, height: 22, fontSize: 11, fontWeight: 700,
                bgcolor: 'primary.main',
                border: `2px solid ${theme.palette.background.paper}`,
                ml: i === 0 ? 0 : -0.75,
              }}
            >
              {(o.name || '?').charAt(0).toUpperCase()}
            </Avatar>
          ))}
        </Box>

        <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
          {others.length > SHOWN ? `+${others.length - SHOWN} editing` : 'also editing'}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default PlanPresence;
