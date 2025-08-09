import React, { useState } from 'react';
import '../../css/Signin.css';
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
import Alert from '@mui/material/Alert';
import { authAPI } from '../../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const signInData = {
        email: formData.email,
        password: formData.password
      };

      console.log('Sending signin data:', signInData);
      const response = await authAPI.signin(signInData);
      console.log('SignIn response:', response);
      
      // Check if the response indicates success
      if (response.data?.success && response.data?.accessToken) {
        // Store the token
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        setSuccess('Sign in successful! Redirecting to home...');
        
        // Clear form data
        setFormData({
          email: '',
          password: ''
        });
        
        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        setError('Unexpected response from server. Please try again.');
      }

    } catch (err: any) {
      console.error('SignIn error:', err);
      
      // Handle different types of errors
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Invalid signin data. Please check your information.');
      } else if (err.response?.status >= 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'An error occurred during sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // You can implement forgot password functionality here
    navigate('/forgot-password');
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google Sign In
    console.log('Google Sign In clicked');
    // You can integrate with Auth0's social login or Google OAuth
  };

  const handleAppleSignIn = () => {
    // TODO: Implement Apple Sign In
    console.log('Apple Sign In clicked');
    // You can integrate with Auth0's social login or Apple OAuth
  };

  return (
    <div className="signin-split-root">
      <div className="signin-split-left" />
      <div className="signin-split-right">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_URL} alt="Tripician Logo"/>
          </div>

          {/* Display error message if signin fails */}
          {error && <Alert severity="error" sx={{mb: 2, mx: 1}}>{error}</Alert>}
          {/* Display success message if signin is successful*/}
          {success && <Alert severity="success" sx={{mb: 2, mx: 1}}>{success}</Alert>}
          
          <form className="signin-form" onSubmit={handleSubmit}>
              <TextField
                id="loginid"
                label="Email Address"
                variant="outlined"
                fullWidth
                type="text"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                autoComplete="email"
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
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    required
                    autoComplete="current-password"
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
              <a 
                href="#" 
                className="signin-forgot"
                onClick={(e) => {
                  e.preventDefault();
                  handleForgotPassword();
                }}
              >
                Forgot password?
              </a>
              <Stack spacing={3} direction="column" className="signin-button-stack">
                <Button 
                  variant="contained" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign in'}
                </Button>
              </Stack>
          </form>
          
          <div className="signin-bottom-text">
            Don't have an account? 
            <a href="/signup" className="signin-link">Sign up</a>
          </div>
          <div className="signin-divider">
            <span>or</span>
          </div>
          <Button 
            variant="outlined" 
            className="signin-social-btn google"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon/> Sign in with Google
          </Button>
          <Button 
            variant="outlined" 
            className="signin-social-btn google"
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            <AppleIcon/> Sign in with Apple
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Signin;