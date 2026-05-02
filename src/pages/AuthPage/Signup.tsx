import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../../assets/css/Signin.css';
import '../../assets/css/Signup.css';
import { KalaMandala } from '../../components/DecorativeComponents/KalaDecor';
import { Eye, EyeOff, Plane, MapPin, Globe, Brain, Check, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';
import { fadeInLeft, fadeInRight, staggerContainer, staggerItem } from '../../utils/animations';

const Signup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const signupBackground = import.meta.env.VITE_SIGNUPPAGE_IMAGE_URL as string | undefined;
    const logoUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;

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

    const handleClickShowPassword = () => setShowPassword(v => !v);
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
        const signupData = {
          fname: formData.firstName,
          lname: formData.lastName,
          email: formData.email,
          password: formData.password
        };

        const response = await authAPI.signup(signupData);
        console.log('Signup response:', response);
        setSuccess(response.data.message || 'Signup successful! Please check your email for verification.');

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
          style={signupBackground ? { backgroundImage: `url(${signupBackground})` } : undefined}
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
            Your journey<br /><em>begins here.</em>
          </motion.h2>
          <motion.p className="auth-left__sub" variants={staggerItem}>
            Join thousands of explorers planning smarter with Tripician.
          </motion.p>
          <motion.ul className="auth-left__perks" variants={staggerContainer(0.08, 0)}>
            <motion.li variants={staggerItem}><Check size={14} /> Free forever — no credit card needed</motion.li>
            <motion.li variants={staggerItem}><MapPin size={14} /> Unlimited trip itineraries</motion.li>
            <motion.li variants={staggerItem}><Globe size={14} /> 150+ destinations covered</motion.li>
            <motion.li variants={staggerItem}><Brain size={14} /> AI-powered trip suggestions</motion.li>
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
        {/* Indian kala mandala — top-right corner */}
        <KalaMandala size={380} color="#FF385C" opacity={0.07} style={{ position: 'absolute', top: -90, right: -90, zIndex: 0 }} />
        {/* Indian kala mandala — bottom-left accent */}
        <KalaMandala size={240} color="#D91A50" opacity={0.05} style={{ position: 'absolute', bottom: -60, left: -60, zIndex: 0 }} />
        <motion.div
          className="auth-card auth-card--signup"
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
          >Create account</motion.h1>
          <motion.p
            className="auth-card__subheading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >Discover journeys that match your vibe</motion.p>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          <motion.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={staggerContainer(0.07, 0.3)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="auth-field-row" variants={staggerItem}>
              <div className="auth-field">
                <label className="auth-field__label">First Name</label>
                <input
                  className="auth-field__input"
                  type="text"
                  placeholder="Alex"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-field__label">Last Name</label>
                <input
                  className="auth-field__input"
                  type="text"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  required
                />
              </div>
            </motion.div>

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
              <label className="auth-field__label">Password</label>
              <div className="auth-field__password-wrap">
                <input
                  className="auth-field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-field__eye"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </motion.div>

            <motion.div className="auth-field" variants={staggerItem}>
              <label className="auth-field__label">Confirm Password</label>
              <div className="auth-field__password-wrap">
                <input
                  className="auth-field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  className="auth-field__eye"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
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
              {loading ? 'Creating Account…' : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.p
            className="auth-switch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Already have an account?
            <a href="/signin" className="auth-switch__link">Sign in</a>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;