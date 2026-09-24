import React from 'react';
import { Box, Menu, MenuItem, Typography, useTheme } from '@mui/material';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { TRANSPORT_MODES, transportIcon, transportLabel } from '../../utils/transportModes';

interface StopConnectorProps {
  /** The stop being left. Its `transport` is the mode for this leg, which is what the map and the saved legs read. */
  from: { name: string; lat?: number; lng?: number; transport?: string };
  to: { name: string; lat?: number; lng?: number };
  readOnly?: boolean;
  onChange?: (transport: string) => void;
}

/**
 * How you get from one stop to the next: a line between the cards with the mode on it.
 *
 * No distance and no duration here on purpose. The map already labels each leg
 * with the real road distance from Directions, and the Reality check quotes a
 * door to door time; a third number derived differently would disagree with both.
 */
const StopConnector: React.FC<StopConnectorProps> = ({ from, to, readOnly = false, onChange }) => {
  const theme = useTheme();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  const chosen = (from.transport ?? '').trim();
  const label = transportLabel(chosen);
  const Icon = transportIcon(chosen);

  // Nothing to say and nothing to set: a read-only plan with no mode draws no line at all.
  if (readOnly && !label) return null;

  const rule = (
    <Box aria-hidden sx={{ flex: 1, height: '1px', bgcolor: theme.custom.surface.border, minWidth: 8 }} />
  );

  const pillSx = {
    display: 'inline-flex', alignItems: 'center', gap: 0.6, flexShrink: 0,
    px: 1.25, height: 26, borderRadius: '999px',
    bgcolor: 'background.paper',
    border: `1px ${label ? 'solid' : 'dashed'} ${theme.custom.surface.border}`,
    color: label ? 'text.primary' : 'text.secondary',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 600, lineHeight: 1,
    cursor: readOnly ? 'default' : 'pointer',
    transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '& svg': { transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}` },
    ...(readOnly ? {} : {
      '@media (hover: hover)': {
        '&:hover': { borderColor: 'text.disabled', color: 'text.primary' },
        '&:hover svg': { transform: 'translateX(2px)' },
      },
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    }),
  } as const;

  const inner = (
    <>
      {label ? <Icon size={14} stroke={1.9} /> : <IconPlus size={13} stroke={2.2} />}
      {label || 'How do you travel?'}
    </>
  );

  const pill = readOnly ? (
    <Box sx={pillSx}>{inner}</Box>
  ) : (
    <Box
      component="button"
      type="button"
      aria-haspopup="menu"
      aria-label={label
        ? `${label} from ${from.name} to ${to.name}. Change it.`
        : `How you travel from ${from.name} to ${to.name}. Not set.`}
      onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
      sx={pillSx}
    >
      {inner}
    </Box>
  );

  const pick = (id: string) => {
    setAnchor(null);
    if (id !== chosen) onChange?.(id);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1, sm: 2 }, py: 0.25 }}>
      {rule}
      {pill}
      {rule}

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '14px', minWidth: 180 } } }}
      >
        <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1, pb: 0.5, color: 'text.disabled' }}>
          {from.name} to {to.name}
        </Typography>
        {TRANSPORT_MODES.map((mode) => (
          <MenuItem key={mode.id} onClick={() => pick(mode.id)} sx={{ gap: 1.25, fontSize: 14 }}>
            <mode.Icon size={16} stroke={1.8} />
            {mode.label}
            {mode.id === chosen && <IconCheck size={15} stroke={2.2} style={{ marginLeft: 'auto' }} />}
          </MenuItem>
        ))}
        {chosen && (
          <MenuItem onClick={() => pick('')} sx={{ fontSize: 14, color: 'text.secondary' }}>
            Leave it out
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default StopConnector;
