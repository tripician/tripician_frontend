import React from 'react';
import { Box, Popover, Typography, useTheme } from '@mui/material';
import type { StudioAction } from '../studioActions';

interface StudioMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  actions: Array<StudioAction & { run: () => void }>;
  /** Phones open it upward from the bottom bar; the header opens it downward. */
  placement?: 'below' | 'above';
}

/**
 * The Studio panel: a row per way of making something.
 *
 * A Popover of two-line rows rather than a MenuItem list, following the story
 * editor's AddBlockMenu. The hint is the point: "Write a story" on its own does
 * not tell somebody it is for a trip they have already taken, which is why almost
 * nobody found it behind the old chevron.
 */
const StudioMenu: React.FC<StudioMenuProps> = ({ anchorEl, onClose, actions, placement = 'below' }) => {
  const theme = useTheme();
  const above = placement === 'above';

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: above ? 'top' : 'bottom', horizontal: above ? 'center' : 'right' }}
      transformOrigin={{ vertical: above ? 'bottom' : 'top', horizontal: above ? 'center' : 'right' }}
      slotProps={{ paper: { sx: { width: 300, p: 1, borderRadius: '16px', mt: above ? 0 : 1, mb: above ? 1.5 : 0 } } }}
    >
      <Box sx={{ display: 'grid', gap: 0.25 }}>
        {actions.map(({ key, label, hint, Icon, logo, run }) => (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => {
              onClose();
              run();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              px: 1.25,
              py: 1.15,
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
                width: 34,
                height: 34,
                borderRadius: '10px',
                color: 'primary.main',
                backgroundImage: logo ? 'none' : theme.custom.gradients.brandSubtle,
              }}
            >
              {logo ? <Icon size={30} /> : <Icon size={17} stroke={1.8} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">{label}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {hint}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
};

export default StudioMenu;
