import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { toggleTheme } from '../../store/themeSlice';

const ThemeToggle: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={handleToggleTheme}
        sx={{
          width: 44,
          height: 44,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
        aria-label="toggle theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={themeMode}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {themeMode === 'light' ? <Brightness4 /> : <Brightness7 />}
          </motion.div>
        </AnimatePresence>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
