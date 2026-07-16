import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  /** Tabler icon component (rendered 28px, brand-tinted) */
  icon: React.ElementType;
  title: string;
  description?: string;
  /** Primary call to action */
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary, low-emphasis action */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Compact variant for panels/popovers */
  dense?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  dense = false,
}) => {
  const theme = useTheme();
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
        py: dense ? 4 : 8,
        gap: dense ? 1 : 1.5,
      }}
    >
      <Box
        sx={{
          width: dense ? 52 : 68,
          height: dense ? 52 : 68,
          borderRadius: dense ? '16px' : '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.custom.gradients.brandSubtle,
          border: `1px solid ${theme.custom.surface.border}`,
          mb: 0.5,
        }}
      >
        <Icon size={dense ? 24 : 30} stroke={1.6} color={theme.palette.primary.main} />
      </Box>
      <Typography variant={dense ? 'subtitle1' : 'h5'} sx={{ color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {(actionLabel || secondaryLabel) && (
        <Box sx={{ display: 'flex', gap: 1.25, mt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <Button variant="contained" size={dense ? 'small' : 'medium'} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button variant="outlined" size={dense ? 'small' : 'medium'} onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EmptyState;
