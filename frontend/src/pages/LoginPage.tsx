import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLoginMutation } from '../app/api';
import { extractErrorMessage } from '../lib/errors';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login({ email, password }).unwrap();
      navigate('/app/board');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your workspace.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password" autoComplete="current-password" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-muted text-center pt-1">
          New here?{' '}
          <Link to="/register" className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            Create an organization
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({
  title, subtitle, children,
}: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Masthead */}
        <div className="mb-7">
          <div className="eyebrow text-faint">Task&nbsp;Tracker</div>
          <div className="mt-1 flex items-baseline gap-2">
            <h1 className="font-display text-5xl leading-none tracking-tight text-ink">
              Ledger<span className="text-signal-ochre">.</span>
            </h1>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px w-8 bg-ink" />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-bone border border-line-strong rounded-card shadow-card p-6">
          <h2 className="font-display text-2xl text-ink mb-5">{title}</h2>
          {children}
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
          Multi-tenant · JWT · RBAC · Redis
        </p>
      </div>
    </div>
  );
}
