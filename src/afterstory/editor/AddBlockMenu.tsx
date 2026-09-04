/**
 * The block picker.
 *
 * Ordered by how often it gets used, not by data model tidiness: text and photo
 * are what someone reaches for nine times out of ten, so they lead and
 * everything else follows.
 */

import React from 'react';
import { Box, Popover, Typography, useTheme } from '@mui/material';
import {
  IconAlignLeft,
  IconHeading,
  IconQuote,
  IconPhoto,
  IconLayoutGrid,
  IconMapPin,
  IconListCheck,
  IconRoute,
  IconCoin,
  IconSeparator,
  IconMovie,
} from '@tabler/icons-react';
import type { StoryBlockType } from '../types';

interface BlockChoice {
  type: StoryBlockType;
  label: string;
  hint: string;
  Icon: React.ElementType;
}

const CHOICES: BlockChoice[] = [
  { type: 'text', label: 'Text', hint: 'Write a paragraph', Icon: IconAlignLeft },
  { type: 'photo', label: 'Photo', hint: 'One picture, with a caption', Icon: IconPhoto },
  { type: 'gallery', label: 'Gallery', hint: 'Several photos together', Icon: IconLayoutGrid },
  { type: 'heading', label: 'Heading', hint: 'Break the story into sections', Icon: IconHeading },
  { type: 'place', label: 'Place', hint: 'Somewhere you went, and your verdict', Icon: IconMapPin },
  { type: 'list', label: 'List', hint: 'Must try, or things worth knowing', Icon: IconListCheck },
  { type: 'quote', label: 'Quote', hint: 'Pull out a line', Icon: IconQuote },
  { type: 'cost', label: 'Costs', hint: 'What the trip actually cost', Icon: IconCoin },
  { type: 'map', label: 'Route', hint: 'The stops, in order', Icon: IconRoute },
  { type: 'related', label: 'More links', hint: 'Extra videos and links, at the end', Icon: IconMovie },
  { type: 'divider', label: 'Divider', hint: 'A pause between sections', Icon: IconSeparator },
];

interface AddBlockMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onPick: (type: StoryBlockType) => void;
}

const AddBlockMenu: React.FC<AddBlockMenuProps> = ({ anchorEl, onClose, onPick }) => {
  const theme = useTheme();

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: { width: 320, p: 1, borderRadius: '16px' } } }}
    >
      <Box sx={{ display: 'grid', gap: 0.25 }}>
        {CHOICES.map(({ type, label, hint, Icon }) => (
          <Box
            key={type}
            component="button"
            type="button"
            onClick={() => {
              onPick(type);
              onClose();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              px: 1.25,
              py: 1,
              border: 0,
              borderRadius: '10px',
              bgcolor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              color: 'text.primary',
              '&:hover': { bgcolor: theme.custom.surface.hover },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                flex: '0 0 auto',
                width: 32,
                height: 32,
                borderRadius: '9px',
                color: 'primary.main',
                backgroundImage: theme.custom.gradients.brandSubtle,
              }}
            >
              <Icon size={16} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">{label}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {hint}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
};

export default AddBlockMenu;
