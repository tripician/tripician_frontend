import React from 'react';
import { Box } from '@mui/material';

export interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Tabler icon component, rendered at 15px before the label. */
  Icon?: React.ElementType;
  /** Set for a multi-select group so assistive tech reads it as a checkbox, not a button. */
  role?: 'button' | 'checkbox';
}

/**
 * Tappable choice chip. Active state is an inverted ink fill, never coral: coral
 * stays reserved for actions, and a chip reports a choice.
 *
 * This started on the Community page as the category and vibe filter, and moved
 * here when the create dialog needed the same thing. It is preferred over a raw
 * MUI `Chip` with an `onClick` because that renders a div with no focus ring and
 * no pressed state, so it is unreachable by keyboard.
 */
export const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, Icon, role = 'button' }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    {...(role === 'checkbox' ? { role: 'checkbox', 'aria-checked': active } : { 'aria-pressed': active })}
    sx={(theme) => ({
      display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
      height: 34, px: 1.75, borderRadius: 999,
      border: `1px solid ${active ? 'transparent' : theme.custom.surface.border}`,
      bgcolor: active ? 'text.primary' : 'background.paper',
      color: active ? 'background.paper' : 'text.secondary',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1,
      cursor: 'pointer',
      transition: `all ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
      '&:hover': active ? {} : { borderColor: 'text.disabled', color: 'text.primary' },
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    })}
  >
    {Icon && <Icon size={15} stroke={1.9} />}
    {label}
  </Box>
);

export default FilterChip;
