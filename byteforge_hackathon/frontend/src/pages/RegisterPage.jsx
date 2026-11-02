import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input } from '../components/ui/input.jsx';

function getSignupErrorMessage(error) {
  const message = error?.message || '';
  const normalized = message.toLowerCase();

  if (normalized.includes('signups not allowed') || normalized.includes('signup is disabled')) {
    return 'Public registration is currently disabled. Please contact the ByteForge team.';
  }
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account may already exist for this email. Try signing in instead.';
  }
  if (normalized.includes('rate limit')) {
    return 'Too many registration attempts. Please wait a few minutes and try again.';
  }
  if (normalized.includes('password')) {
    return 'Your password does not meet the requirements. Use at least 8 characters and try again.';
  }
  if (normalized.includes('invalid email')) {
    return 'Enter a valid email address.';
  }
  return message || 'Unable to create your account. Please try again.';
}

export function RegisterPage() {
  const { signUp, configError } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(configError);
  const [notice, setNotice] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    setNotice('');
    setConfirmationEmail('');

    const normalizedName = displayName.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName) {
      setError('Enter your display name.');
      return;
    }
    if (normalizedName.length > 80) {
      setError('Your display name must be 80 characters or fewer.');
      return;
    }
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(normalizedEmail, password, normalizedName);
      if (result.session) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setConfirmationEmail(normalizedEmail);
      setNotice(
        'Your account is ready for email verification. Open the confirmation link we sent you to continue to your dashboard. If you do not see it, check your spam folder.',
      );
    } catch (err) {
      setError(getSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-ink">Create your workspace</h2>
        <Field label="Display name" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
        {notice ? (
          <div className="space-y-1 text-sm text-emerald-700" role="status">
            <p>{notice}</p>
            {confirmationEmail ? <p className="font-medium">{confirmationEmail}</p> : null}
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating your account…' : 'Create account'}
        </Button>
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link className="font-semibold text-accent" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
