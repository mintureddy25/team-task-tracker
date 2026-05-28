import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAppSelector } from '../app/hooks';
import {
  useListProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '../app/api';
import Modal from '../components/Modal';
import { extractErrorMessage } from '../lib/errors';
import type { Project } from '../lib/types';

export default function ProjectsPage() {
  const me = useAppSelector(s => s.auth.user);
  const canWrite = me?.role === 'ADMIN' || me?.role === 'MANAGER';
  const { data } = useListProjectsQuery({ limit: 50 });
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteProject] = useDeleteProjectMutation();

  async function onDelete(p: Project) {
    if (!confirm(`Delete "${p.name}"? All its tasks will also be removed.`)) return;
    try {
      await deleteProject(p.id).unwrap();
      toast.success('Project deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        {canWrite && <button onClick={() => setCreating(true)} className="btn-primary">+ New Project</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.items.map(p => (
          <div key={p.id} className="card hover:border-slate-700 group">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              {canWrite && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditing(p)} className="btn-ghost p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>
                    </svg>
                  </button>
                  <button onClick={() => onDelete(p)} className="btn-ghost p-1 hover:text-red-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              )}
            </div>
            {p.description && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{p.description}</p>}
            <p className="text-xs text-slate-500 mt-3">
              Created {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
            </p>
          </div>
        ))}
        {data && data.items.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No projects yet
          </div>
        )}
      </div>

      {creating && <ProjectForm mode="create" onClose={() => setCreating(false)} />}
      {editing && <ProjectForm mode="edit" project={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProjectForm({
  mode, project, onClose,
}: {
  mode: 'create' | 'edit';
  project?: Project;
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [createP, { isLoading: creating }] = useCreateProjectMutation();
  const [updateP, { isLoading: updating }] = useUpdateProjectMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await createP({ name, description: description || undefined }).unwrap();
        toast.success('Project created');
      } else if (project) {
        await updateP({ id: project.id, name, description: description || null }).unwrap();
        toast.success('Project updated');
      }
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'New project' : 'Edit project'}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input required maxLength={160} value={name} onChange={e => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={3} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={creating || updating} className="btn-primary">
            {(creating || updating) ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
