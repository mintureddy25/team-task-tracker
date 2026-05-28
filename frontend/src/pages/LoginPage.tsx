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
    <AuthLayout title="Welcome back" subtitle="Sign in to your Task Tracker workspace">
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
        <p className="text-sm text-slate-400 text-center">
          New here?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300">
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
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/20 mb-3">
            <span className="text-brand-400 font-bold text-xl">T</span>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
