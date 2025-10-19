import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AuthStyles.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { resetPassword, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'Failed to send reset email. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setSuccess(false);
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (error) {
      setError(getErrorMessage(error.code));
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-small">
        <div className="auth-header">
          <h1 className="auth-logo">Money Moves</h1>
          <p className="auth-tagline">Reset your password</p>
        </div>

        <div className="auth-content">
          <h2 className="auth-title">Forgot password?</h2>
          <p className="auth-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success">
              <span className="success-icon">✓</span>
              <div>
                <strong>Password reset email sent!</strong>
                <p className="success-subtext">
                  Check your inbox for further instructions. The link will expire in 1 hour.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn auth-btn-primary"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login" className="auth-link-secondary">
              ← Back to login
            </Link>
          </div>

          {success && (
            <div className="auth-footer" style={{ marginTop: '1rem' }}>
              <p className="auth-footer-text">
                Didn't receive the email?{' '}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="auth-link-primary"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resend
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="auth-footer-legal">
        <Link to="/terms" className="legal-link">Terms of Service</Link>
        <span className="legal-separator">•</span>
        <Link to="/privacy" className="legal-link">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
