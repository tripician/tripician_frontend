import React from 'react';
import '../../assets/css/Signup.css';
import { useState } from 'react';

import {
  Box,
  TextField,
  Button,
  Paper,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Alert,
  Typography
} from '@mui/material';
import { VisibilityOff, Visibility, Explore } from '@mui/icons-material';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });

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
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError('Please fill in all required fields.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
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
        // Fixed: Map frontend field names to backend field names
        const signupData = {
          fname: formData.firstName,
          lname: formData.lastName,
          email: formData.email,
          password: formData.password
        };

        const response = await authAPI.signup(signupData);
        console.log('Signup response:', response);
        setSuccess(response.data.message || 'Signup successful! Please check your email for verification.');
        
        // Optional: Add a delay before redirect to show success message
        setTimeout(() => {
          navigate('/signin');
        }, 2000);

      } catch (err: any) {
        console.error('Signup error:', err);
        setError(err.response?.data?.message || 'An error occurred during signup. Please try again.');
      } finally {
        setLoading(false);
      }
    };

  return (
    <Box className="signup-root">
      <Box className="signup-bg" />
      <Box className="signup-content">
          
        <Paper elevation={3} className="signup-paper">
          <div className="signin-logo">
            <img src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_URL} alt="Tripician Logo"/>
          </div>
          <Box className="signup-subheader" sx={{ textAlign: 'center', mb: 3 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 300,
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}
              >
                <Explore sx={{ color: 'primary.main', fontSize: '1.2em' }} />
                Join us and start your journey!
              </Typography>
            </Box>

          {/* Display error message if signup fails */}
          {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
          {/* Display success message if signup is successful*/}
          {success && <Alert severity="success" sx={{mb: 2}}>{success}</Alert>}

          
          <form onSubmit={handleSubmit} className="signup-form">
            
            <div className="signup-grid">
              <div className="signup-grid-row">
                <TextField 
                    label="First Name" 
                    fullWidth
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                />
                <TextField 
                    label="Last Name" 
                    fullWidth
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                />
              </div>
              <div className="signup-grid-row">
                <TextField 
                    label="Email Address" 
                    fullWidth
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    required
                />
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
                      required
                      value={formData.password}
                      onChange={handleInputChange('password')}
                    />
                  </FormControl>
                </div>
              <div className="signin-password-row">
                  <FormControl
                    variant="outlined"
                    fullWidth
                    sx={{ m: 0, mt: '-10px'}}
                  >
                    <InputLabel htmlFor="confirm-password">Confirm Password</InputLabel>
                    <OutlinedInput
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}                      
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
                      required
                    />
                  </FormControl>
                </div>
            </div>

            {/* Fixed: Moved button inside form */}
            <Stack spacing={3} direction="column" className="signup-button-stack">
                  <Button 
                    variant="contained" 
                    type="submit"
                    disabled={loading}
                  >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
            </Stack>
          </form>
          
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