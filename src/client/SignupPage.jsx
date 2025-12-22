/**
 * SignupPage – uses shared auth components for a clean, Google OAuth-enabled signup experience.
 * After successful signup, auto-logs in and redirects to dashboard.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, EmailPasswordForm, GoogleAuthButton } from './auth/index.ts';
import './auth/auth.css';

const SignupPage = () => {
  const [showLoading, setShowLoading] = useState(false);

  return (
    <>
      <AuthLayout title="Create your WedBoardPro account" subtitle="Set up access for your planning studio.">
        <EmailPasswordForm mode="signup" />

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <span className="auth-divider-line" />
        </div>

        <GoogleAuthButton />

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Log in
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

export default SignupPage;


