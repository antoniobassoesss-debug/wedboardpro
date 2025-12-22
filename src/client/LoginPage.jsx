/**
 * LoginPage – uses shared auth components for a clean, Google OAuth-enabled login experience.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, EmailPasswordForm, GoogleAuthButton } from './auth/index.js';
import './auth/auth.css';

const LoginPage = () => {
  const [showLoading, setShowLoading] = useState(false);

  return (
    <>
      <AuthLayout title="Log in to WedBoardPro" subtitle="Enter your credentials to access the dashboard.">
        <EmailPasswordForm mode="login" />

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <span className="auth-divider-line" />
        </div>

        <GoogleAuthButton />

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-footer-link">
            Sign up
          </Link>
        </p>
      </AuthLayout>

      {showLoading && (
        <div className="auth-loading-overlay">
          <img src="/loadinglogo.png" alt="Loading" className="auth-loading-logo" />
        </div>
      )}
    </>
  );
};

export default LoginPage;


