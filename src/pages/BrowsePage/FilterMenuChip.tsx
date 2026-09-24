import React from 'react';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

export interface FilterMenuOption<T extends string> {
  value: T;
  label: string;
  /** A second line under the label, for when the label alone is not precise. */
  hint?: string;
  Icon?: React.ElementType;
}

interface FilterMenuChipProps<T extends string> {
  /** What the pill says when nothing is chosen. */
  label: string;
  value: T | null;
  options: FilterMenuOption<T>[];
  onChange: (value: T | null) => void;
  /** The top row that clears the choice. */
  anyLabel?: string;
}

// Same pill as FilterChip, so a row mixing toggles and menus reads as one set; this one opens a menu and names its choice.
function FilterMenuChip<T extends string>({
  label, value, options, onChange, anyLabel = 'Any',
}: FilterMenuChipProps<T>) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const chosen = options.find((o) => o.value === value) ?? null;
  const active = chosen !== null;

  const pick = (next: T | null) => {
    setAnchor(null);
    onChange(next);
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={(theme) => ({
          display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
          height: 34, pl: 1.75, pr: 1.25, borderRadius: 999,
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
        {chosen?.Icon && <chosen.Icon size={15} stroke={1.9} />}
        {chosen ? chosen.label : label}
        <IconChevronDown size={14} stroke={2} />
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: '14px' } } }}
      >
        <MenuItem selected={!active} onClick={() => pick(null)} sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{anyLabel}</Typography>
          {!active && <IconCheck size={16} stroke={2} />}
        </MenuItem>
        {options.map((o) => {
          const isChosen = o.value === value;
          return (
            <MenuItem key={o.value} selected={isChosen} onClick={() => pick(o.value)} sx={{ py: 1, gap: 1.25 }}>
              {o.Icon && <Box sx={{ display: 'flex', color: 'text.secondary' }}><o.Icon size={16} stroke={1.9} /></Box>}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.label}</Typography>
                {o.hint && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{o.hint}</Typography>
                )}
              </Box>
              {isChosen && <IconCheck size={16} stroke={2} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export default FilterMenuChip;
