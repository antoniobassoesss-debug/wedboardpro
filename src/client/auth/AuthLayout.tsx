/**
 * AuthLayout – shared centered card layout with logo, title, and description
 * for login, signup, and callback pages.
 */
import React, { useEffect } from 'react';
import './auth.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  // Override the fixed overflow:hidden from index.html for auth pages
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    // Save original styles
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalRootOverflow = root?.style.overflow;
    const originalRootPosition = root?.style.position;

    // Enable scrolling
    html.style.overflowY = 'auto';
    html.style.overflowX = 'hidden';
    html.style.height = 'auto';
    html.style.minHeight = '100vh';
    
    body.style.overflowY = 'auto';
    body.style.overflowX = 'hidden';
    body.style.height = 'auto';
    body.style.minHeight = '100vh';
    
    if (root) {
      root.style.overflow = 'visible';
      root.style.position = 'static';
      root.style.height = 'auto';
      root.style.minHeight = '100vh';
    }

    // Restore on unmount
    return () => {
      html.style.overflowY = '';
      html.style.overflowX = '';
      html.style.height = '';
      html.style.minHeight = '';
      html.style.overflow = originalHtmlOverflow;
      
      body.style.overflowY = '';
      body.style.overflowX = '';
      body.style.height = '';
      body.style.minHeight = '';
      body.style.overflow = originalBodyOverflow;
      
      if (root) {
        root.style.overflow = originalRootOverflow || '';
        root.style.position = originalRootPosition || '';
        root.style.height = '';
        root.style.minHeight = '';
      }
    };
  }, []);

  return (
    <div className="auth-page" style={{ height: 'auto', overflow: 'visible' }}>
      <div className="auth-card" style={{ height: 'auto' }}>
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

