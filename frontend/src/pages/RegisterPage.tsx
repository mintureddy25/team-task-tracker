import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRegisterMutation } from '../app/api';
import { extractErrorMessage } from '../lib/errors';
import { AuthLayout } from './LoginPage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register(form).unwrap();
      toast.success('Organization created!');
      navigate('/app/board');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <AuthLayout title="Create your organization" subtitle="You'll be the first ADMIN.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Organization name</label>
          <input
            required maxLength={160}
            value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })}
            className="input" placeholder="Acme Inc"
          />
        </div>
        <div>
          <label className="label">Your name</label>
          <input
            required maxLength={120}
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="input" placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email" required
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="input" placeholder="jane@acme.com"
          />
        </div>
        <div>
          <label className="label">Password (min 8 chars)</label>
          <input
            type="password" required minLength={8} maxLength={72}
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="input"
          />
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? 'Creating…' : 'Create organization'}
        </button>
        <p className="text-sm text-muted text-center pt-1">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
