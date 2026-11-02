import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  GitBranch,
  LockKeyhole,
  Moon,
  Sparkles,
  Sun,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Input } from '../components/ui/input.jsx';
import { useTheme } from '../app/theme-context.js';
import './LoginPage.css';

function CreatorIllustration() {
  return (
    <div className="login-illustration" aria-hidden="true">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />
      <div className="login-float login-float-play">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="currentColor" />
          <path d="m10 8 6 4-6 4V8Z" fill="#fff" />
        </svg>
      </div>
      <div className="login-float login-float-image">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="8.5" cy="9" r="1.7" fill="currentColor" />
          <path d="m4.5 17 5-4 3.5 3 2.5-2 4 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="login-float login-float-spark">
        <Sparkles size={20} />
      </div>
      <div className="login-ai-chip">
        <Sparkles size={19} />
        <span>AI</span>
      </div>
      <div className="login-analytics-card">
        <div className="login-analytics-top">
          <span>Audience growth</span>
          <span className="login-growth-pill">SAMPLE</span>
        </div>
        <div className="login-chart">
          <div className="login-chart-grid" />
          <svg viewBox="0 0 260 92" preserveAspectRatio="none">
            <defs>
              <linearGradient id="loginChartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#a78bfa" stopOpacity=".34" />
                <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="loginChartLine" x1="0" x2="1">
                <stop offset="0" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
            <path d="M0 72 C24 68 27 50 51 58 S80 63 100 44 S128 51 150 35 S181 43 198 25 S230 36 260 8 V92 H0Z" fill="url(#loginChartFill)" />
            <path d="M0 72 C24 68 27 50 51 58 S80 63 100 44 S128 51 150 35 S181 43 198 25 S230 36 260 8" fill="none" stroke="url(#loginChartLine)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="login-chart-labels"><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></div>
      </div>
      <div className="login-laptop">
        <div className="login-laptop-screen">
          <div className="login-laptop-toolbar"><i /><i /><i /><span>creator.studio</span></div>
          <div className="login-studio-layout">
            <div className="login-studio-sidebar"><b /><i /><i /><i /><i /></div>
            <div className="login-studio-main">
              <div className="login-studio-heading"><b /><span /></div>
              <div className="login-studio-preview">
                <div className="login-preview-art"><Sparkles size={22} /></div>
                <div className="login-preview-lines"><i /><i /><i /></div>
              </div>
              <div className="login-studio-stats"><i /><i /><i /></div>
            </div>
          </div>
        </div>
        <div className="login-laptop-base" />
      </div>
      <div className="login-content-pill"><span /> Your next big idea starts here</div>
    </div>
  );
}

export function LoginPage() {
  const { signIn, configError } = useAuth();
  const { preference, setThemePreference } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(configError);
  const [loading, setLoading] = useState(false);
  const isDark = preference === 'dark';

  async function onSubmit(event) {
    event.preventDefault();
    setError(configError);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="ByteForge introduction">
        <div className="login-brand-top">
          <Link className="login-brand" to="/" aria-label="ByteForge home">
            <span className="login-brand-mark"><Sparkles size={20} /></span>
            <span>ByteForge</span>
          </Link>
          <span className="login-brand-label">CREATOR OS</span>
        </div>
        <div className="login-brand-copy">
          <p className="login-eyebrow"><span /> BUILT FOR THE NEXT GENERATION OF CREATORS</p>
          <h1>
            AI-Powered Content <span>Creation</span> &amp; <span>Growth</span> Platform
          </h1>
          <p className="login-tagline">Create <i>•</i> Schedule <i>•</i> Analyze <i>•</i> Grow</p>
          <p className="login-brand-description">
            Your creative work deserves a business that runs just as brilliantly.
          </p>
        </div>
        <CreatorIllustration />
        <p className="login-brand-footer">One workspace for everything you create.</p>
      </section>

      <section className="login-form-panel" aria-label="Sign in">
        <div className="login-theme-toggle" role="group" aria-label="Color theme">
          <button
            type="button"
            className={!isDark ? 'is-selected' : ''}
            aria-label="Use light theme"
            aria-pressed={!isDark}
            onClick={() => setThemePreference('light')}
          >
            <Sun size={16} /><span>Light</span>
          </button>
          <button
            type="button"
            className={isDark ? 'is-selected' : ''}
            aria-label="Use dark theme"
            aria-pressed={isDark}
            onClick={() => setThemePreference('dark')}
          >
            <Moon size={16} /><span>Dark</span>
          </button>
        </div>

        <div className="login-card">
          <div className="login-card-heading">
            <div className="login-card-icon"><Sparkles size={20} /></div>
            <p className="login-kicker">WELCOME TO BYTEFORGE</p>
            <h2>Welcome Back <span role="img" aria-label="waving hand">👋</span></h2>
            <p>Sign in to continue to ByteForge</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <div className="login-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="login-input"
                />
              </div>
            </div>
            <div className="login-field">
              <div className="login-password-label">
                <label htmlFor="password">Password</label>
                <button
                  className="login-unavailable-link"
                  type="button"
                  disabled
                  title="Password recovery is not available in this app yet."
                >
                  Forgot password?
                </button>
              </div>
              <div className="login-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="login-input login-password-input"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {error ? <p className="login-error" role="alert">{error}</p> : null}
            <button type="submit" className="login-submit" disabled={loading}>
              <span>{loading ? 'Signing in…' : 'Sign In'}</span>
              {!loading ? <ArrowUpRight size={17} /> : null}
            </button>
          </form>

          <div className="login-divider"><span />or continue with<span /></div>
          <div className="login-social-buttons">
            <button
              type="button"
              className="login-social-button"
              disabled
              title="Google sign-in is not configured."
              aria-label="Google sign-in unavailable"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.38a4.6 4.6 0 0 1-2 3.02v2.47h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.41l-3.24-2.47c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.55A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.41 13.96a6.02 6.02 0 0 1 0-3.92V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.55Z" />
                <path fill="#EA4335" d="M12 5.92c1.47 0 2.79.5 3.83 1.52l2.87-2.87C16.96 2.95 14.7 2 12 2a10 10 0 0 0-8.94 5.49l3.35 2.55C7.2 7.68 9.4 5.92 12 5.92Z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="login-social-button"
              disabled
              title="GitHub sign-in is not configured."
              aria-label="GitHub sign-in unavailable"
            >
              <GitBranch size={18} />
              GitHub
            </button>
          </div>
          <p className="login-social-note">Social sign-in is not configured yet.</p>
          <p className="login-signup">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create Account <ArrowUpRight size={14} /></Link>
          </p>
        </div>
        <p className="login-legal">By continuing, you agree to build something great.</p>
      </section>
    </main>
  );
}
