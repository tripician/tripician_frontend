import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  dense?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
  retryLabel = 'Try again',
  dense = false,
}) => {
  const theme = useTheme();
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
        py: dense ? 4 : 8,
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: dense ? 52 : 64,
          height: dense ? 52 : 64,
          borderRadius: dense ? '16px' : '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            theme.palette.mode === 'light' ? 'rgba(229,72,77,0.08)' : 'rgba(242,102,105,0.14)',
          border: `1px solid ${theme.custom.surface.border}`,
          mb: 0.5,
        }}
      >
        <IconAlertTriangle size={dense ? 24 : 28} stroke={1.6} color={theme.palette.error.main} />
      </Box>
      <Typography variant={dense ? 'subtitle1' : 'h5'}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400 }}>
        {description}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          size={dense ? 'small' : 'medium'}
          startIcon={<IconRefresh size={16} />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          {retryLabel}
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
