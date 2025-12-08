import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import LayoutMakerPage from './LayoutMakerPage';
import { WeddingDashboard } from './dashboard/index';
import SuppliersPage from './suppliers/SuppliersPage';

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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<WeddingDashboard />} />
        <Route path="/layout-maker" element={<LayoutMakerPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/demo" element={<PlaceholderPage title="Book a Demo" />} />
        <Route path="/pricing" element={<PlaceholderPage title="Pricing" />} />
        <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
        <Route path="/terms" element={<PlaceholderPage title="Terms of Service" />} />
        <Route path="/contact" element={<PlaceholderPage title="Contact Us" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


