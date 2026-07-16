import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../../assets/css/Signin.css';
import { KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import { Plane, MapPin, Globe, Brain, ArrowLeft, Mail } from 'lucide-react';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';
import { fadeInLeft, fadeInRight, staggerContainer, staggerItem } from '../../utils/animations';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const loginBackground = import.meta.env.VITE_SIGNINPAGE_IMAGE_URL as string | undefined;
  const logoUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(trimmedEmail);
    } catch {
      // Intentionally swallowed - backend always returns 200; treat any
      // network error the same way to avoid leaking account existence.
    } finally {
      setLoading(false);
      // Always show the success state regardless of backend response.
      setSubmitted(true);
    }
  };

  return (
    <div className="auth-root">
      {/*  Left brand pane  */}
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

      {/*  Right form pane  */}
      <motion.div
        className="auth-right"
        variants={fadeInRight}
        initial="hidden"
        animate="visible"
      >
        <button className="auth-back-btn" onClick={() => navigate('/signin')}>
          <ArrowLeft size={15} />
          Back to sign in
        </button>

        <KalaLotus size={380} color="#FF385C" opacity={0.07} style={{ position: 'absolute', top: -90, right: -90, zIndex: 0 }} />
        <KalaLotus size={260} color="#FF6B8A" opacity={0.055} style={{ position: 'absolute', bottom: -65, left: -65, zIndex: 0 }} />

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.15 }}
        >
          {submitted ? (
            /*  Success state  */
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}>
                <Mail size={24} style={{ color: '#4ade80' }} />
              </div>
              <h1 className="auth-card__heading" style={{ margin: 0 }}>Check your inbox</h1>
              <p className="auth-card__subheading" style={{ margin: 0 }}>
                If an account with that email exists, a password reset link has been sent.
                Check your inbox and follow the instructions.
              </p>
              <motion.button
                className="auth-btn auth-btn--primary"
                style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate('/signin')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Back to Sign In
              </motion.button>
            </motion.div>
          ) : (
            /*  Form state  */
            <>
              <motion.h1
                className="auth-card__heading"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                Forgot password?
              </motion.h1>
              <motion.p
                className="auth-card__subheading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                Enter your email and we'll send you a reset link.
              </motion.p>

              {error && <div className="auth-alert auth-alert--error">{error}</div>}

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
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </motion.div>

                <motion.button
                  className="auth-btn auth-btn--primary"
                  type="submit"
                  disabled={loading}
                  variants={staggerItem}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </motion.button>
              </motion.form>

              <motion.p
                className="auth-switch"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Remember your password?
                <a href="/signin" className="auth-switch__link">Sign in</a>
              </motion.p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
