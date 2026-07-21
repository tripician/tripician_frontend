import React from 'react';
import { Box, useTheme } from '@mui/material';

/** Neutral pill badge rendered over card imagery (vibe, live, status tags). */
const ImageBadge: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      px: 1.1, py: 0.45, borderRadius: 999,
      bgcolor: isDark ? 'rgba(22,22,27,0.88)' : 'rgba(255,255,255,0.93)',
      color: 'text.primary',
      fontSize: 11, fontWeight: 650, letterSpacing: '0.01em', lineHeight: 1,
      boxShadow: theme.custom.shadows.card,
      ...sx,
    }}>
      {children}
    </Box>
  );
};

export default ImageBadge;
