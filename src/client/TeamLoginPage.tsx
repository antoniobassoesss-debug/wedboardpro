import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './team.css';

interface LoginCredentials {
  email: string;
  password: string;
}

const TeamLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/team/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      sessionStorage.setItem('team_token', data.token);
      sessionStorage.setItem('team_user', JSON.stringify(data.user));
      navigate('/team');
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="team-login-page">
      <div className="team-login-container">
        <div className="team-login-card">
          <div className="team-login-header">
            <Link to="/" className="team-logo">
              <img src="/logo/iconlogo.png" alt="WedBoardPro" />
              <span>WedBoardPro</span>
            </Link>
            <h1>Team Access</h1>
            <p>Sign in to access the admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="team-login-form">
            {error && (
              <div className="team-error-message">
                {error}
              </div>
            )}

            <div className="team-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="team-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="team-login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="team-login-footer">
            <Link to="/" className="team-back-link">
              Back to WedBoardPro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLoginPage;
