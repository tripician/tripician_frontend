/**
 * The two things you make here, under the composer.
 *
 * The composer above takes a thought. This takes the two pieces of work the
 * product is actually for, and it sits on the wall rather than only in Studio
 * because a menu in the header is somewhere you go on purpose. A traveller who
 * has just published nothing and has nothing to say needs the offer in front of
 * them, in the column they are already reading.
 *
 * One card split down the middle, not two cards. Two would read as two unrelated
 * offers and take twice the vertical space directly under another card; halves of
 * one thing read as a choice between them.
 *
 * Neither half opens anything itself. The trip dialog is owned by the app shell
 * and the story dialog by the header, which is also why the story half goes
 * through the same window event the bottom bar uses rather than mounting a second
 * copy of the modal.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { IconFeather, IconMap } from '@tabler/icons-react';
import { useAppShell } from '../pages/PageLayout/AppShellContext';
import { FEATURE_FLAGS } from '../config/featureFlags';

interface CreateOption {
  key: string;
  label: string;
  hint: string;
  Icon: React.ElementType;
  run: () => void;
}

const CreateRow: React.FC = () => {
  const theme = useTheme();
  const { openCreateTrip } = useAppShell();

  const options: CreateOption[] = [
    {
      key: 'story',
      label: 'Create story',
      hint: 'Write up a trip you already took',
      Icon: IconFeather,
      run: () => window.dispatchEvent(new Event('story:create')),
    },
    {
      key: 'plan',
      label: 'Create plan',
      hint: 'Day by day, with your crew',
      Icon: IconMap,
      run: () => openCreateTrip(),
    },
  ].filter((o) => o.key !== 'story' || FEATURE_FLAGS.afterStory);

  return (
    <Box
      sx={{
        mt: 1.5,
        display: 'flex',
        // Stacked on a phone, because two halves of a 360px row leave neither
        // enough width for its hint and the hint is what makes the offer land.
        flexDirection: { xs: 'column', sm: 'row' },
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        overflow: 'hidden',
      }}
    >
      {options.map((option, i) => (
        <Box
          key={option.key}
          component="button"
          type="button"
          onClick={option.run}
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.75,
            border: 0,
            // The divider between the halves, and only between them. It turns
            // with the stack, so it is never a vertical rule across a column.
            ...(i > 0
              ? {
                  borderTop: { xs: `1px solid ${theme.custom.surface.border}`, sm: 0 },
                  borderLeft: { xs: 0, sm: `1px solid ${theme.custom.surface.border}` },
                }
              : null),
            bgcolor: 'transparent',
            cursor: 'pointer',
            font: 'inherit',
            textAlign: 'left',
            transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
            '&:hover': { bgcolor: theme.custom.surface.hover },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              flex: '0 0 auto',
              width: 38,
              height: 38,
              borderRadius: '11px',
              color: 'primary.main',
              backgroundImage: theme.custom.gradients.brandSubtle,
            }}
          >
            <option.Icon size={19} stroke={1.8} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
              {option.label}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
              {option.hint}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default CreateRow;
