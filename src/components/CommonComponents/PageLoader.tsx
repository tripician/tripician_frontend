import React, { useEffect, useState } from 'react';
import { BRAND } from '../../theme';
import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

const DEFAULT_MESSAGES = [
  'Getting things ready…',
  'Loading your data…',
  'Hang tight, almost there…',
  'Just a moment…',
];

interface PageLoaderProps {
  /** Optional array of rotating messages to display */
  messages?: string[];
  /** Use 'fullscreen' (default) for page-level, 'inline' for section-level */
  variant?: 'fullscreen' | 'inline';
}

const PageLoader: React.FC<PageLoaderProps> = ({
  messages = DEFAULT_MESSAGES,
  variant = 'fullscreen',
}) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages]);

  const isFullscreen = variant === 'fullscreen';

  return (
    <Box
      sx={{
        ...(isFullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
            }
          : {
              py: 8,
            }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
      }}
    >
      {/* Spinner */}
      <Box sx={{ position: 'relative', width: 52, height: 52 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid ${alpha(BRAND.coral, 0.12)}`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'primary.main',
            animation: 'pageloader-spin 0.9s linear infinite',
            '@keyframes pageloader-spin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
        <CircularProgress
          size={52}
          thickness={2.5}
          sx={{
            position: 'absolute',
            inset: 0,
            color: 'transparent',
            opacity: 0,
          }}
        />
      </Box>

      {/* Cycling message */}
      <Typography
        key={msgIndex}
        sx={{
          fontWeight: 500,
          fontSize: '0.92rem',
          color: 'text.secondary',
          textAlign: 'center',
          maxWidth: 300,
          animation: 'pageloader-fadein 0.5s ease',
          '@keyframes pageloader-fadein': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {messages[msgIndex]}
      </Typography>
    </Box>
  );
};

export default PageLoader;
