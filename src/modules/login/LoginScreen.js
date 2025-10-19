import React, { useState } from "react";
import "./LoginScreen.css"; // Optional: replace with Tailwind if preferred

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <img src="/logo-moneymoves.svg" alt="moneymoves" className="logo" />
        <div className="register-link">
          <span>Don't have an account?</span>
          <a href="/register">Register</a>
        </div>
      </header>

      <main className="login-main">
        <div className="avatar-circle">
          <i className="icon-user" />
        </div>

        <h1 className="title">Login to your account</h1>
        <p className="subtitle">Enter your details to continue</p>

        <div className="social-login-buttons">
          <button className="social-btn apple"></button>
          <button className="social-btn google">
            <img src="/icons/google.svg" alt="Google" />
          </button>
          <button className="social-btn linkedin">
            <img src="/icons/linkedin.svg" alt="LinkedIn" />
          </button>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <form className="login-form">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={togglePassword}
              aria-label="Toggle password visibility"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="form-options">
            <label className="keep-logged">
              <input type="checkbox" />
              Keep me logged in
            </label>
            <a href="/forgot-password" className="forgot-link">
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </main>

      <footer className="login-footer">
        <span>© 2025 moneymoves.app</span>
        <div className="language-select">
          <img src="/icons/globe.svg" alt="Language" />
          <span>ENG</span>
        </div>
      </footer>
    </div>
  );
}
