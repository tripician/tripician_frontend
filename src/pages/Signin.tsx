

import React from 'react';
import './css/SignIn.css';

const Signin = () => {
  return (
    <div className="signin-split-root">
      <div className="signin-split-left" />
      <div className="signin-split-right">
        <div className="signin-card">
          <div className="signin-logo">
            {/* Replace with your logo if available */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7F5AF0" />
                  <stop offset="1" stopColor="#2CB67D" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="24" fill="url(#logo-gradient)" />
              <path d="M24 12L32 36H16L24 12Z" fill="#fff" />
            </svg>
          </div>
          <div className="signin-appname">TripZero</div>
          <div className="signin-title">Sign in to your account</div>
          <form className="signin-form">
            <input className="signin-input" type="email" placeholder="Email address" />
            <div className="signin-password-row">
              <input className="signin-input" type="password" placeholder="Password" />
              <a href="#" className="signin-forgot">Forgot password?</a>
            </div>
            <button className="signin-btn" type="submit">Sign in</button>
          </form>
          <div className="signin-bottom-text">
            Don't have an account? <a href="#" className="signin-link">Sign up</a>
          </div>
          <div className="signin-divider">
            <span>or</span>
          </div>
          <button className="signin-social-btn google">
            <span className="signin-social-icon">&#x1F5A5;</span> Sign in with Google
          </button>
          <button className="signin-social-btn apple">
            <span className="signin-social-icon">&#63743;</span> Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signin;