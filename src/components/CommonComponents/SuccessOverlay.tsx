import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Dispatch helper: window.dispatchEvent(new CustomEvent('app:success',{ detail:{ message:'Saved!' }}));

const SuccessOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const msg = ce.detail?.message || 'Success';
      setMessage(msg);
      setOpen(true);
      // Auto hide after 2200ms
      setTimeout(() => setOpen(false), 2200);
    };
    window.addEventListener('app:success', handler as EventListener);
    return () => window.removeEventListener('app:success', handler as EventListener);
  }, []);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          bgcolor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          position: 'absolute',
          inset: 0,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          px: 4,
          py: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: '0 24px 48px rgba(25,118,210,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          minWidth: 280,
          animation: 'fadeInScale 0.35s ease',
          '@keyframes fadeInScale': {
            from: { opacity: 0, transform: 'scale(.85)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        <CheckCircleIcon color='success' sx={{ fontSize: 48 }} />
        <Typography variant='h6' sx={{ fontWeight: 600, textAlign: 'center' }}>
          {message}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          Your action completed successfully.
        </Typography>
      </Box>
    </Box>
  );
};

export default SuccessOverlay;
