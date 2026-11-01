import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input } from '../components/ui/input.jsx';

export function LoginPage() {
  const { signIn, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(configError);
  const [loading, setLoading] = useState(false);

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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm uppercase tracking-[0.25em] text-accent-2">ByteForge</p>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">The creator business command center.</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Track collaborations, plan content, and keep earnings honest — then get grounded next steps from your own
            records.
          </p>
        </div>
        <p className="text-sm text-slate-500">Built for independent creators. No fake stats.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">Sign in</h2>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-sm text-slate-600">
            New here?{' '}
            <Link className="font-semibold text-accent" to="/register">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
