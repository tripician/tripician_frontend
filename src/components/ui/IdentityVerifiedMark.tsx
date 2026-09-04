/**
 * The small check on a traveller's avatar: this is a real, identity-verified
 * person.
 *
 * Deliberately not the same object as VerifiedTripBadge. That one is an
 * editorial judgement about a trip and is granted by hand; this one is a fact
 * about an account. Keeping them visually separate is the point, so this stays
 * a mark on the avatar and never becomes a pill next to a title.
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';

interface IdentityVerifiedMarkProps {
  /** Nothing renders when false, so callers can pass the flag through directly. */
  verified?: boolean;
  /** Diameter in px. The ring and tick scale off it. */
  size?: number;
}

const IdentityVerifiedMark: React.FC<IdentityVerifiedMarkProps> = ({ verified, size = 18 }) => {
  if (!verified) return null;

  return (
    <Tooltip title="Identity verified" arrow placement="top">
      <Box
        sx={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'info.main',
          color: '#fff',
          border: `${Math.max(2, Math.round(size / 9))}px solid #fff`,
        }}
      >
        <IconCheck size={Math.round(size * 0.55)} stroke={3} />
      </Box>
    </Tooltip>
  );
};

export default IdentityVerifiedMark;
