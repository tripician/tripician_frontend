import React from 'react';
import { Box } from '@mui/material';

/**
 * Lightweight T-shirt glyph for the Packing section.
 *
 * Its own file so `plannerNavItems.tsx` exports only data and a helper: a module
 * that exports both a component and non-components breaks Vite's fast refresh
 * (react-refresh/only-export-components).
 */
const TshirtIcon: React.FC<{ fontSize?: 'small' | 'medium' | 'large' }> = ({ fontSize = 'small' }) => {
  const size = fontSize === 'small' ? 20 : fontSize === 'large' ? 32 : 24;
  return (
    <Box
      component='svg'
      viewBox='0 0 24 24'
      sx={{ width: size, height: size, display: 'block' }}
      focusable={false}
      aria-hidden='true'
    >
      <path
        fill='currentColor'
        d='M16 3l-2 2h-4L8 3 3 5.5l1.5 3.5L7 8v11c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V8l2.5 1 1.5-3.5L16 3z'
      />
    </Box>
  );
};

export default TshirtIcon;
