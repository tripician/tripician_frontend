import React from 'react';
import tripicianLogo from '../../assets/TripicianLogofull2.png'; 
import { useState } from 'react';

import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack
} from '@mui/material';
import '../css/Signup.css';
import { VisibilityOff, Visibility } from '@mui/icons-material';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  
    const handleClickShowPassword = () => setShowPassword((show) => !show);
    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    };
    const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    };

  return (
    <Box className="signup-root">
      <Box className="signup-bg" />
      <Box className="signup-content">
          
        <Paper elevation={3} className="signup-paper">
          <div className="signin-logo">
            <img src={tripicianLogo} alt="Tripician Logo"/>
          </div>

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

            <div className="signin-password-row">
                <FormControl
                  variant="outlined"
                  fullWidth
                  sx={{ m: 0 }}
                >
                  <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-password"
                    type={showPassword ? 'text' : 'password'}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'hide the password' : 'display the password'}
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          onMouseUp={handleMouseUpPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Password"
                  />
                </FormControl>
              </div>
            <div className="signin-password-row">
                <FormControl
                  variant="outlined"
                  fullWidth
                  sx={{ m: 0, mt: '-10px'}}
                >
                  <InputLabel htmlFor="outlined-adornment-password">Confirm Password</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-password"
                    type={showPassword ? 'text' : 'password'}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'hide the password' : 'display the password'}
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          onMouseUp={handleMouseUpPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Confirm Password"
                  />
                </FormControl>
              </div>
          </div>
          <Stack spacing={3} direction="column" className="signup-button-stack">
                <Button variant="contained" type="submit">Sign Up</Button>
          </Stack>
          <div className="signin-bottom-text">
            Already have an account?
            <a href="/signin" className="signin-link">Sign In</a>
          </div>
        </Paper>
      </Box>
    </Box>
  );
};

export default Signup;