import React, { useState } from 'react';
import '../css/Signin.css';
import tripicianLogo from '../../assets/TripicianLogofull2.png'; 
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="signin-split-root">
      <div className="signin-split-left" />
      <div className="signin-split-right">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={tripicianLogo} alt="Tripician Logo"/>
          </div>

          
          <form className="signin-form">
              <TextField
                id="loginid"
                label="Email or Nickname"
                variant="outlined"
                fullWidth
                sx={{ m: 1 }}
              />

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
                <a href="#" className="signin-forgot">Forgot password?</a>
              </div>
              <Stack spacing={3} direction="column" className="signin-button-stack">
                <Button variant="contained" type="submit">Sign in</Button>
              </Stack>
          </form>
          
          <div className="signin-bottom-text">
            Dont have an account? 
            <a href="#" className="signin-link">Sign up</a>
          </div>
          <div className="signin-divider">
            <span>or</span>
          </div>
          <Button variant="outlined" className="signin-social-btn google">
          <GoogleIcon/> Sign in with Google
          </Button>
          <Button variant="outlined" className="signin-social-btn google">
          <AppleIcon/> Sign in with Apple
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Signin;