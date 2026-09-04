/**
 * The line a traveller writes about themselves, set as an epigraph.
 *
 * Everything else on a profile is derived: countries visited, trips published,
 * a follower count. This is the only part the person actually wrote, so it gets
 * the display face and a reading measure instead of being folded into the row of
 * pills with "I'm from" and a phone number.
 *
 * Stored as a `bio.highlights` entry keyed `intro`, which is why there is no
 * migration behind it. `ProfileDetails` filters that key back out so the same
 * text does not also appear as a chip.
 */

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconPencil } from '@tabler/icons-react';

/** The one key that renders as prose rather than as a pill. */
export const INTRO_KEY = 'intro';

/** Reading measure in characters. Matches the story reader's journal template. */
const MEASURE = 68;

export function readIntro(profile: any): string {
  const highlights = Array.isArray(profile?.bio?.highlights) ? profile.bio.highlights : [];
  const found = highlights.find((h: any) => h?.key === INTRO_KEY);
  return typeof found?.value === 'string' ? found.value.trim() : '';
}

interface ProfileIntroProps {
  profile: any;
  /** Shows the write-one invitation when there is no intro yet. Own profile only. */
  editable?: boolean;
  onEdit?: () => void;
  /** Rail variant: no top margin, smaller face, no reading measure to fight the column. */
  compact?: boolean;
}

const ProfileIntro: React.FC<ProfileIntroProps> = ({ profile, editable, onEdit, compact }) => {
  const theme = useTheme();
  const intro = readIntro(profile);

  if (!intro) {
    // A stranger's empty intro is just a profile without one. Yours is a
    // prompt, because you are the only person who can fill it.
    if (!editable) return null;

    return (
      <Box
        sx={{
          mt: compact ? 0 : { xs: 3, md: 4 },
          p: compact ? 2 : { xs: 2.5, md: 3 },
          borderRadius: '16px',
          border: `1px dashed ${theme.custom.surface.border}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: theme.custom.fontDisplay,
            fontSize: compact ? '1rem' : { xs: '1.125rem', md: '1.25rem' },
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          Say how you travel
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mt: 0.75, maxWidth: compact ? '100%' : `${MEASURE}ch` }}
        >
          A few lines is enough. People deciding whether to travel with you read this
          before they read your itineraries.
        </Typography>
        <Button
          onClick={onEdit}
          variant="outlined"
          size={compact ? 'small' : 'medium'}
          startIcon={<IconPencil size={15} />}
          sx={{ mt: 2 }}
        >
          Write yours
        </Button>
      </Box>
    );
  }

  return (
    <Typography
      sx={{
        mt: compact ? 0 : { xs: 3, md: 4 },
        maxWidth: compact ? '100%' : `${MEASURE}ch`,
        fontFamily: theme.custom.fontDisplay,
        fontSize: compact ? '1.0625rem' : { xs: '1.1875rem', md: '1.375rem' },
        lineHeight: 1.6,
        color: 'text.primary',
        whiteSpace: 'pre-line',
        // An unbroken run of characters is not a word, and in a 340px rail it
        // pushes the whole column wide rather than wrapping.
        overflowWrap: 'anywhere',
      }}
    >
      {intro}
    </Typography>
  );
};

export default ProfileIntro;
