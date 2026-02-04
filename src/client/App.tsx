import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MarketingHome from './MarketingHome';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import EmailConfirmationWaiting from './EmailConfirmationWaiting';
import { AuthCallbackPage, AuthUrlHandler } from './auth/index.ts';
import { WeddingDashboard } from './dashboard/index';
import SuppliersPage from './suppliers/SuppliersPage';
import PricingPage from './PricingPage';
import InviteAcceptPage from './InviteAcceptPage.js';

// Lazy load LayoutMakerPage (store-based version) to avoid circular dependency issues
const LayoutMakerPage = lazy(() => import('./LayoutMakerPageStore'));

// Lazy load Phase 2 Test Page
const Phase2TestPage = lazy(() => import('../layout-maker/components/Phase2TestPage').then(module => ({ default: module.Phase2TestPage })));

// Lazy load Phase 5 Test Page
const Phase5TestPage = lazy(() => import('../layout-maker/components/Phase5TestPage').then(module => ({ default: module.Phase5TestPage })));

// Simple placeholder component for pages under construction
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
    padding: '2rem',
    background: '#f8fafc'
  }}>
    <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a' }}>{title}</h1>
    <p style={{ color: '#64748b' }}>This page is coming soon.</p>
    <a href="/" style={{ 
      marginTop: '1rem', 
      padding: '0.5rem 1.5rem', 
      background: '#0f172a', 
      color: 'white', 
      borderRadius: '9999px',
      textDecoration: 'none',
      fontSize: '0.875rem',
      fontWeight: 600
    }}>
      Back to Home
    </a>
  </div>
);

const App: React.FC = () => {
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      // log basic info about clicks for debugging
      // eslint-disable-next-line no-console
      console.log('[GlobalClickDebug] click', {
        tag: (e.target as Element)?.tagName,
        id: (e.target as Element)?.id,
        classes: (e.target as Element)?.className,
        x: e.clientX,
        y: e.clientY,
      });
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);
  return (
    <BrowserRouter>
      <AuthUrlHandler />
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<EmailConfirmationWaiting />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dashboard" element={<WeddingDashboard />} />
        <Route 
          path="/layout-maker" 
          element={
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh',
                background: '#ffffff',
              }}>
                <img src="/loadinglogo.png" alt="Loading" style={{ width: '160px', height: 'auto' }} />
              </div>
            }>
              <LayoutMakerPage />
            </Suspense>
          } 
        />
        <Route 
          path="/layout-maker-phase2" 
          element={
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh',
                background: '#ffffff',
              }}>
                Loading Phase 2...
              </div>
            }>
              <Phase2TestPage />
            </Suspense>
          } 
        />
        <Route 
          path="/layout-maker-phase5" 
          element={
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh',
                background: '#ffffff',
              }}>
                Loading Phase 5...
              </div>
            }>
              <Phase5TestPage />
            </Suspense>
          } 
        />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/demo" element={<PlaceholderPage title="Book a Demo" />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
        <Route path="/terms" element={<PlaceholderPage title="Terms of Service" />} />
        <Route path="/contact" element={<PlaceholderPage title="Contact Us" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


