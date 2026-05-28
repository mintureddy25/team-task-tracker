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
import { extractErrorMessage } from '../lib/errors';
import { ROLES, type Role, type User } from '../lib/types';

export default function UsersPage() {
  const me = useAppSelector(s => s.auth.user)!;
  const { data } = useListUsersQuery({ limit: 100 });
  const [invite] = useInviteMutation();
  const [updateRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [showInvite, setShowInvite] = useState(false);

  async function onChangeRole(u: User, role: Role) {
    try {
      await updateRole({ id: u.id, role }).unwrap();
      toast.success(`${u.name} → ${role}`);
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }
  async function onDelete(u: User) {
    if (!confirm(`Delete ${u.name}? Their tasks/projects will be reassigned to you.`)) return;
    try {
      await deleteUser(u.id).unwrap();
      toast.success('User deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button onClick={() => setShowInvite(true)} className="btn-primary">+ Invite User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(u => {
              const isSelf = u.id === me.id;
              return (
                <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium">{u.name}{isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={e => onChangeRole(u, e.target.value as Role)}
                      className={clsx('input py-1 text-xs w-32', isSelf && 'cursor-not-allowed')}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.createdAt && formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(u)}
                      disabled={isSelf}
                      className="btn-ghost text-red-400 hover:text-red-300 text-xs disabled:opacity-30"
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
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
