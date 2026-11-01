import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input } from '../components/ui/input.jsx';

export function RegisterPage() {
  const { signUp, configError } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(configError);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError(configError);
    setNotice('');
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      setNotice('Account created. If email confirmation is enabled, check your inbox before signing in.');
    } catch (err) {
      setError(err.message || 'Unable to register.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-ink">Create your workspace</h2>
        <Field label="Display name" htmlFor="name">
          <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Register'}
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
