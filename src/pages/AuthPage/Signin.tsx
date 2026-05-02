import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../../assets/css/Signin.css';
import { KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import { Eye, EyeOff, Plane, MapPin, Globe, Brain, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile } from '../../store/userSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { fadeInLeft, fadeInRight, staggerContainer, staggerItem } from '../../utils/animations';

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const loginBackground = import.meta.env.VITE_SIGNINPAGE_IMAGE_URL as string | undefined;
  const logoUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      dispatch(fetchUserProfile());

      if (response.data?.success && response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        setSuccess('Sign in successful! Redirecting to home...');
        setFormData({ email: '', password: '' });

        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        setError('Unexpected response from server. Please try again.');
      }
    } catch (err: any) {
      console.error('SignIn error:', err);
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
    navigate('/forgot-password');
  };

  const handleGoogleSignIn = () => {
    console.log('Google Sign In clicked');
  };

  const handleAppleSignIn = () => {
    console.log('Apple Sign In clicked');
  };

  return (
    <div className="auth-root">
      {/* ── Left brand pane ─────────────────────────────────────── */}
      <motion.div
        className="auth-left"
        variants={fadeInLeft}
        initial="hidden"
        animate="visible"
      >
        <div
          className="auth-left__bg"
          style={loginBackground ? { backgroundImage: `url(${loginBackground})` } : undefined}
        />
        <div className="auth-left__overlay" />
        <motion.div
          className="auth-left__content"
          variants={staggerContainer(0.12, 0.3)}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="auth-left__logo" variants={staggerItem}>
            {logoUrl
              ? <img src={logoUrl} alt="Tripician" className="auth-left__logo-img" />
              : <><Plane size={20} /><span>Tripician</span></>
            }
          </motion.div>
          <motion.h2 className="auth-left__title" variants={staggerItem}>
            Plan Smarter.<br /><em>Travel Further.</em>
          </motion.h2>
          <motion.p className="auth-left__sub" variants={staggerItem}>
            Your AI-powered companion for every adventure.
          </motion.p>
          <motion.ul className="auth-left__perks" variants={staggerContainer(0.08, 0)}>
            <motion.li variants={staggerItem}><MapPin size={14} /> Day-by-day itinerary planner</motion.li>
            <motion.li variants={staggerItem}><Globe size={14} /> 150+ destinations covered</motion.li>
            <motion.li variants={staggerItem}><Brain size={14} /> Smart AI trip suggestions</motion.li>
          </motion.ul>
        </motion.div>
      </motion.div>

      {/* ── Right form pane ─────────────────────────────────────── */}
      <motion.div
        className="auth-right"
        variants={fadeInRight}
        initial="hidden"
        animate="visible"
      >
        {/* Back to landing */}
        <button className="auth-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          Back
        </button>
        {/* Indian kala lotus — top-right corner */}
        <KalaLotus size={380} color="#FF385C" opacity={0.07} style={{ position: 'absolute', top: -90, right: -90, zIndex: 0 }} />
        {/* Indian kala lotus — bottom-left accent */}
        <KalaLotus size={260} color="#FF6B8A" opacity={0.055} style={{ position: 'absolute', bottom: -65, left: -65, zIndex: 0 }} />
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.15 }}
        >
          {/* <div className="auth-card__logo">
            {logoUrl
              ? <img src={logoUrl} alt="Tripician" className="auth-card__logo-img" />
              : <><Plane size={19} /><span>Tripician</span></>
            }
          </div> */}

          <motion.h1
            className="auth-card__heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >Welcome back</motion.h1>
          <motion.p
            className="auth-card__subheading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >Sign in to your account to continue</motion.p>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          <motion.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={staggerContainer(0.08, 0.3)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="auth-field" variants={staggerItem}>
              <label className="auth-field__label">Email Address</label>
              <input
                className="auth-field__input"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div className="auth-field" variants={staggerItem}>
              <div className="auth-field__label-row">
                <label className="auth-field__label">Password</label>
                <a
                  href="#"
                  className="auth-forgot"
                  onClick={e => { e.preventDefault(); handleForgotPassword(); }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="auth-field__password-wrap">
                <input
                  className="auth-field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-field__eye"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </motion.div>

            <motion.button
              className="auth-btn auth-btn--primary"
              type="submit"
              disabled={loading}
              variants={staggerItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </motion.button>
          </motion.form>

          <motion.p
            className="auth-switch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Don't have an account?
            <a href="/signup" className="auth-switch__link">Sign up free</a>
          </motion.p>

          <div className="auth-divider"><span>or continue with</span></div>

          <motion.div
            className="auth-social"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <motion.button
              className="auth-social-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <GoogleIcon style={{ fontSize: 17 }} /> Google
            </motion.button>
            <motion.button
              className="auth-social-btn"
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <AppleIcon style={{ fontSize: 17 }} /> Apple
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signin;

