import React from 'react';
import { Box } from '@mui/material';

/**
 * Modern pill-style feature badge for unreleased functionality.
 * Usage: <SoonTag />
 * Props allow size and variant customization while maintaining a consistent aesthetic.
 */
export interface SoonTagProps {
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'neutral' | 'primary' | 'warning';
  sx?: any;
}

// Minimal compact sizing (micro badge)
const sizeMap = {
  xs: { fontSize: 8, py: 0.20, px: 0.45, radius: 0.5, opacity: 0.65 },
  sm: { fontSize: 10, py: 0.3, px: 0.65, radius: 0.5, opacity: 0.7 },
  md: { fontSize: 11, py: 0.35, px: 0.75, radius: 0.5, opacity: 0.75 }
};

const SoonTag: React.FC<SoonTagProps> = ({ label='SOON', size='xs', /* variant unused after white/black override */ sx }) => (
  <Box
    component='span'
  sx={(_) => {
  const sz = sizeMap[size];
      // Force white background, black text & black border regardless of theme/variant.
      const paletteBg = '#ffffff';
      const variantColors = { fg: '#000000', border: '#000000' };
      return {
        display:'inline-flex',
        alignItems:'center',
        justifyContent:'center',
        fontSize: sz.fontSize,
    fontWeight: 600,
        letterSpacing: .5,
        padding: `${Math.round(sz.py * 4)}px ${Math.round(sz.px * 8)}px`,
  borderRadius: sz.radius,
        background: paletteBg,
  color: variantColors.fg,
  border: `1px solid ${variantColors.border}`,
        boxShadow: 'none',
        textTransform:'none',
        userSelect:'none',
        backdropFilter:'none',
        WebkitBackdropFilter:'none',
  lineHeight: 1,
        fontFamily: 'Inter, system-ui, sans-serif',
    opacity: sz.opacity,
        ...sx
      };
    }}
  >{label}</Box>
);

export default SoonTag;
