import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getValidAccessToken } from './utils/sessionManager.js';

interface InvitationDetails {
  invitation: {
    id: string;
    email: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
  team: {
    id: string;
    name: string;
  };
}

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = await getValidAccessToken();
      setIsLoggedIn(!!accessToken);

      // Get current user email from session
      if (accessToken) {
        try {
          const sessionStr = localStorage.getItem('wedboarpro_session');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            setCurrentUserEmail(session?.user?.email?.toLowerCase() || null);
          }
        } catch {
          // ignore
        }
      }
    };
    checkAuth();
  }, []);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load invitation');
          setLoading(false);
          return;
        }

        setDetails(data);
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      // Not logged in - redirect to login with return URL
      const returnUrl = encodeURIComponent(`/invite/${token}`);
      navigate(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const res = await fetch('/api/teams/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  }, [token, navigate]);

  // Check if the logged-in user's email matches the invitation
  const emailMismatch = isLoggedIn && details && currentUserEmail &&
    currentUserEmail !== details.invitation.email.toLowerCase();

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={styles.title}>Invitation Not Found</h1>
          <p style={styles.errorText}>{error}</p>
          <Link to="/" style={styles.homeLink}>Go to Home</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 style={styles.title}>Welcome to the Team!</h1>
          <p style={styles.subtitle}>
            You've successfully joined <strong>{details?.team.name}</strong>
          </p>
          <p style={styles.redirectText}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img src="/logo/iconlogo.png" alt="WedBoardPro" style={styles.logo} />
        </div>

        {/* Team invite header */}
        <h1 style={styles.title}>You're Invited!</h1>
        <p style={styles.subtitle}>
          You've been invited to join <strong>{details?.team.name}</strong> on WedBoardPro
        </p>

        {/* Invitation details */}
        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Team</span>
            <span style={styles.detailValue}>{details?.team.name}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Invited Email</span>
            <span style={styles.detailValue}>{details?.invitation.email}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Expires</span>
            <span style={styles.detailValue}>
              {details ? new Date(details.invitation.expires_at).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorBoxText}>{error}</p>
          </div>
        )}

        {/* Email mismatch warning */}
        {emailMismatch && (
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              You're logged in as <strong>{currentUserEmail}</strong>, but this invitation was sent to <strong>{details?.invitation.email}</strong>.
            </p>
            <p style={styles.warningSubtext}>
              Please log out and log in with the correct account, or contact your team administrator.
            </p>
          </div>
        )}

        {/* Actions */}
        {!emailMismatch && (
          <div style={styles.actions}>
            {isLoggedIn ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  ...styles.primaryButton,
                  opacity: accepting ? 0.7 : 1,
                  cursor: accepting ? 'not-allowed' : 'pointer',
                }}
              >
                {accepting ? 'Joining Team...' : 'Accept Invitation'}
              </button>
            ) : (
              <>
                <p style={styles.loginPrompt}>
                  Sign in or create an account to accept this invitation
                </p>
                <Link
                  to={`/login?returnUrl=${encodeURIComponent(`/invite/${token}`)}`}
                  style={styles.primaryButton}
                >
                  Sign In
                </Link>
                <Link
                  to={`/signup?returnUrl=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(details?.invitation.email || '')}`}
                  style={styles.secondaryButton}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        )}

        {/* Decline option */}
        <p style={styles.declineText}>
          <Link to="/" style={styles.declineLink}>No thanks, go to homepage</Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: 40,
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: 'contain',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '0 0 28px',
    fontSize: 15,
    color: '#64748b',
    lineHeight: 1.5,
  },
  detailsBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    textAlign: 'left',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
  },
  detailValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 600,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorBoxText: {
    margin: 0,
    fontSize: 14,
    color: '#dc2626',
  },
  warningBox: {
    background: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    textAlign: 'left',
  },
  warningText: {
    margin: '0 0 8px',
    fontSize: 14,
    color: '#b45309',
  },
  warningSubtext: {
    margin: 0,
    fontSize: 13,
    color: '#92400e',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  loginPrompt: {
    margin: '0 0 8px',
    fontSize: 14,
    color: '#64748b',
  },
  primaryButton: {
    display: 'block',
    width: '100%',
    padding: '14px 24px',
    border: 'none',
    borderRadius: 12,
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  secondaryButton: {
    display: 'block',
    width: '100%',
    padding: '14px 24px',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  declineText: {
    margin: 0,
    fontSize: 13,
  },
  declineLink: {
    color: '#94a3b8',
    textDecoration: 'none',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid #e2e8f0',
    borderTopColor: '#0f172a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    margin: 0,
    fontSize: 14,
    color: '#64748b',
  },
  errorIcon: {
    marginBottom: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  errorText: {
    margin: '0 0 24px',
    fontSize: 15,
    color: '#64748b',
  },
  homeLink: {
    display: 'inline-block',
    padding: '12px 24px',
    background: '#0f172a',
    color: '#ffffff',
    borderRadius: 12,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
  redirectText: {
    margin: '16px 0 0',
    fontSize: 14,
    color: '#64748b',
  },
};

export default InviteAcceptPage;
