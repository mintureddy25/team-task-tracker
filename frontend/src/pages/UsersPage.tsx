import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useAppSelector } from '../app/hooks';
import {
  useListUsersQuery,
  useInviteMutation,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
} from '../app/api';
import Modal from '../components/Modal';
import { useConfirm } from '../components/confirm-context';
import { extractErrorMessage } from '../lib/errors';
import { ROLES, type Role, type User } from '../lib/types';

export default function UsersPage() {
  const me = useAppSelector(s => s.auth.user)!;
  const { data } = useListUsersQuery({ limit: 100 });
  const [invite] = useInviteMutation();
  const [updateRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [showInvite, setShowInvite] = useState(false);
  const confirm = useConfirm();

  async function onChangeRole(u: User, role: Role) {
    try {
      await updateRole({ id: u.id, role }).unwrap();
      toast.success(`${u.name} → ${role}`);
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }
  async function onDelete(u: User) {
    const ok = await confirm({
      title: 'Delete user',
      message: <>Delete <strong className="font-semibold">{u.name}</strong>? Their tasks and projects will be reassigned to you.</>,
      confirmText: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUser(u.id).unwrap();
      toast.success('User deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap animate-fade-up">
        <div>
          <div className="eyebrow">03 — Organization</div>
          <h1 className="font-display text-4xl text-ink mt-1">Users</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-2">
            {data?.items.length ?? 0} member{(data?.items.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary"><span className="text-base leading-none">+</span> Invite User</button>
      </header>

      <div className="bg-bone border border-line rounded-card shadow-card overflow-hidden animate-fade-up"
           style={{ animationDelay: '60ms' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="text-left px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Name</th>
              <th className="text-left px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Email</th>
              <th className="text-left px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Role</th>
              <th className="text-left px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Joined</th>
              <th className="text-right px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(u => {
              const isSelf = u.id === me.id;
              return (
                <tr key={u.id} className="border-t border-line hover:bg-ink/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-ink">{u.name}{isSelf && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-faint">(you)</span>}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={e => onChangeRole(u, e.target.value as Role)}
                      className={clsx('input py-1 text-xs w-32 font-mono', isSelf && 'cursor-not-allowed opacity-60')}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wide text-faint">
                    {u.createdAt && formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onDelete(u)}
                      disabled={isSelf}
                      className="btn-ghost text-signal-brick hover:bg-signal-brick/[0.08] text-xs disabled:opacity-25"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={async input => {
            try {
              await invite(input).unwrap();
              toast.success('User invited');
              return true;
            } catch (err) {
              toast.error(extractErrorMessage(err as never));
              return false;
            }
          }}
        />
      )}
    </div>
  );
}

function InviteModal({
  onClose, onInvite,
}: {
  onClose: () => void;
  onInvite: (input: { email: string; password: string; name: string; role: Role }) => Promise<boolean>;
}) {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'MEMBER' as Role });
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await onInvite(form);
    setLoading(false);
    if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title="Invite user">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Initial password (min 8)</label>
          <input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} className="input">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-line mt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
