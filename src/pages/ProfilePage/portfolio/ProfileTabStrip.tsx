import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';

export interface ProfileTab<T extends string> {
  id: T;
  label: string;
  Icon: React.ElementType;
  /** A count after the label, when it says something. */
  count?: number | null;
}

/**
 * The profile's tab strip: the app's icon strip, given its labels back because
 * a desktop has the room. Centred over a full-width hairline, the active tab
 * underlined in the brand colour exactly as the app does it.
 */
function ProfileTabStrip<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: ReadonlyArray<ProfileTab<T>>;
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <Box
      role="tablist"
      aria-label="Profile"
      sx={(theme) => ({
        display: 'flex',
        justifyContent: 'center',
        gap: { xs: 0, sm: 3, md: 5 },
        borderBottom: `1px solid ${theme.custom.surface.border}`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      })}
    >
      {tabs.map(({ id, label, Icon, count }) => {
        const selected = id === value;
        return (
          <ButtonBase
            key={id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            sx={(theme) => ({
              position: 'relative',
              flex: { xs: 1, sm: '0 0 auto' },
              minWidth: { sm: 96 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.875,
              px: { xs: 1, sm: 1.5 },
              py: 1.75,
              color: selected ? 'text.primary' : 'text.secondary',
              fontFamily: 'inherit',
              transition: `color ${theme.custom.motion.duration.fast} ease`,
              '&:hover': { color: 'text.primary' },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: { xs: 8, sm: 4 },
                right: { xs: 8, sm: 4 },
                bottom: -1,
                height: '2px',
                borderRadius: '2px',
                bgcolor: 'primary.main',
                transform: selected ? 'scaleX(1)' : 'scaleX(0)',
                transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
              },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2, borderRadius: '8px' },
            })}
          >
            <Icon size={19} stroke={selected ? 2 : 1.7} />
            <Typography
              component="span"
              sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', display: { xs: selected ? 'inline' : 'none', sm: 'inline' } }}
            >
              {label}
              {count ? <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.75 }}>{count}</Box> : null}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export default ProfileTabStrip;
