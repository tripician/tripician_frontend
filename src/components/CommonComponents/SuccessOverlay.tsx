import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion, AnimatePresence } from 'framer-motion';

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

  return (
    <AnimatePresence>
    {open && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
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
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
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
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};

export default SuccessOverlay;
