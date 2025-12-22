/**
 * AuthLayout – shared centered card layout with logo, title, and description
 * for login, signup, and callback pages.
 */
import React from 'react';
import './auth.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/logo/iconlogo.png"
            alt="WedBoardPro"
            className="auth-logo"
          />
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

