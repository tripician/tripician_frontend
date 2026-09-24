import React from 'react';
import { Box, Typography } from '@mui/material';
import { CATEGORIES } from '../CommunityPage/communityConstants';

interface VibeStripProps {
  /** Vibe keys that some plan or story on this tab actually carries. */
  present: Set<string>;
  value: string | null;
  onChange: (vibe: string | null) => void;
}

// Browse by mood: one icon tab per vibe with something behind it, so no tap ever lands on an empty page.
const VibeStrip: React.FC<VibeStripProps> = ({ present, value, onChange }) => {
  const tabs = CATEGORIES.filter((c) => c.id === 'all' || present.has(c.id) || c.id === value);
  if (tabs.length < 2) return null;

  return (
    <Box
      role="group"
      aria-label="Vibe"
      sx={(t) => ({
        display: 'flex',
        gap: { xs: 2.5, sm: 3.5 },
        overflowX: 'auto',
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 0 },
        borderBottom: `1px solid ${t.custom.surface.border}`,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      })}
    >
      {tabs.map((c) => {
        const active = c.id === 'all' ? value === null : value === c.id;
        return (
          <Box
            key={c.id}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => onChange(c.id === 'all' ? null : c.id)}
            sx={(t) => ({
              position: 'relative',
              flexShrink: 0,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 52,
              px: 0.25,
              pt: 1,
              pb: 1.5,
              border: 'none',
              bgcolor: 'transparent',
              fontFamily: 'inherit',
              color: active ? 'text.primary' : 'text.secondary',
              cursor: active ? 'default' : 'pointer',
              transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
              '& svg': { transition: `transform ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}` },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                borderRadius: 2,
                bgcolor: active ? 'text.primary' : 'transparent',
                transition: `background-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
              },
              '@media (hover: hover)': active ? {} : {
                '&:hover': { color: 'text.primary' },
                '&:hover svg': { transform: 'translateY(-2px) scale(1.08)' },
                '&:hover::after': { bgcolor: t.custom.surface.border },
              },
              '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: -2, borderRadius: '8px' },
            })}
          >
            <c.Icon size={24} stroke={active ? 2 : 1.6} />
            <Typography variant="caption" component="span" sx={{ color: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {c.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default VibeStrip;
