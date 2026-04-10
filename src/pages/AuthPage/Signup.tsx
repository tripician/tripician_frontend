import React, { useState } from 'react';
import '../../assets/css/Signin.css';
import '../../assets/css/Signup.css';
import { Eye, EyeOff, Plane, MapPin, Globe, Brain, Check } from 'lucide-react';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useNavigate } from 'react-router-dom';

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
      <div className="auth-left">
        <div
          className="auth-left__bg"
          style={signupBackground ? { backgroundImage: `url(${signupBackground})` } : undefined}
        />
        <div className="auth-left__overlay" />
        <div className="auth-left__content">
          <div className="auth-left__logo">
            {logoUrl
              ? <img src={logoUrl} alt="Tripician" className="auth-left__logo-img" />
              : <><Plane size={20} /><span>Tripician</span></>
            }
          </div>
          <h2 className="auth-left__title">
            Your journey<br /><em>begins here.</em>
          </h2>
          <p className="auth-left__sub">
            Join thousands of explorers planning smarter with Tripician.
          </p>
          <ul className="auth-left__perks">
            <li><Check size={14} /> Free forever — no credit card needed</li>
            <li><MapPin size={14} /> Unlimited trip itineraries</li>
            <li><Globe size={14} /> 150+ destinations covered</li>
            <li><Brain size={14} /> AI-powered trip suggestions</li>
          </ul>
        </div>
      </div>

      {/* ── Right form pane ─────────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-card auth-card--signup">
          {/* <div className="auth-card__logo">
            {logoUrl
              ? <img src={logoUrl} alt="Tripician" className="auth-card__logo-img" />
              : <><Plane size={19} /><span>Tripician</span></>
            }
          </div> */}

          <h1 className="auth-card__heading">Create account</h1>
          <p className="auth-card__subheading">Start planning your next adventure</p>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-row">
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
            </div>

            <div className="auth-field">
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
            </div>

            <div className="auth-field">
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
            </div>

            <div className="auth-field">
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
            </div>

            <button className="auth-btn auth-btn--primary" type="submit" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?
            <a href="/signin" className="auth-switch__link">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;