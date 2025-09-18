import React from 'react';
import { Box, Typography } from '@mui/material';

// Lightweight placeholder; can be expanded with real expense tracking later
const ExpensesPanel: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h6' fontWeight={600} gutterBottom>Expenses</Typography>
      <Typography variant='body2' color='text.secondary'>Track and manage your trip expenses here. (Placeholder)</Typography>
    </Box>
  );
};

export default ExpensesPanel;
