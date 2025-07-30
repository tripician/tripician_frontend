import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import './css/Signup.css';

const Signup = () => {
  return (
    <Box className="signup-root">
      <Box className="signup-bg" />
      <Box className="signup-content">
        <Paper elevation={3} className="signup-paper">
          <Typography variant="h5" gutterBottom>
            Sign Up
          </Typography>
          <div className="signup-grid">
            <div className="signup-grid-row">
              <TextField label="First Name" fullWidth />
              <TextField label="Last Name" fullWidth />
            </div>
            <div className="signup-grid-row">
              <TextField label="Nickname" fullWidth />
            </div>
            <div className="signup-grid-row">
              <TextField label="Email Address" fullWidth />
            </div>
            <div className="signup-grid-row">
              <TextField label="Password" type="password" fullWidth />
            </div>
            <div className="signup-grid-row">
              <TextField label="Confirm Password" type="password" fullWidth />
            </div>
          </div>
          <Button fullWidth variant="contained" className="signup-btn">
            Sign Up
          </Button>
          <Typography variant="body2" className="signup-link">
            Already have an account? <a href="/signin">Sign In</a>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Signup;