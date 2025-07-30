
import React from 'react';
import './css/Home.css';
import { Box, Typography } from '@mui/material';

export default function Home() {
  return (
    <Box className="home-split-root">
      <Box className="home-split-left" />
      <Box className="home-split-right">
        <Typography variant="h3" className="home-title">
          Tripician
        </Typography>
        <Typography variant="h5" className="home-welcome">
          Welcome to Tripician!
        </Typography>
      </Box>
    </Box>
  );
}