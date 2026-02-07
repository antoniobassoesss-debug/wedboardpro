/**
 * LoginPage – uses shared auth components for a clean, Google OAuth-enabled login experience.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, EmailPasswordForm, GoogleAuthButton } from './auth/index.ts';
import './auth/auth.css';

const LoginPage: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);

  return (
    <>
      <AuthLayout
        title="Welcome back"
        subtitle="Enter your credentials to access your account."
      >
        <EmailPasswordForm mode="login" />

        {/* Divider */}
        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <span className="auth-divider-line" />
        </div>

        {/* Google OAuth */}
        <GoogleAuthButton />

        {/* Footer link */}
        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-footer-link">
            Sign up
          </Link>
        </p>
      </AuthLayout>

      {/* Loading overlay shown during form submission */}
      {showLoading && (
        <div className="auth-loading-overlay">
          <img
            src="/loadinglogo.png"
            alt="Loading"
            className="auth-loading-logo"
          />
        </div>
      )}
    </>
  );
};

export default LoginPage;
