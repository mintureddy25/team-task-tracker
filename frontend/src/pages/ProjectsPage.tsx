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
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap animate-fade-up">
        <div>
          <div className="eyebrow">02 — Workspace</div>
          <h1 className="font-display text-4xl text-ink mt-1">Projects</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-2">
            {data?.items.length ?? 0} project{(data?.items.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        {canWrite && <button onClick={() => setCreating(true)} className="btn-primary"><span className="text-base leading-none">+</span> New Project</button>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((p, i) => (
          <div
            key={p.id}
            className="card hover:-translate-y-0.5 hover:shadow-card-hover hover:border-line-strong transition-all
                       duration-150 group animate-fade-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-[11px] text-faint shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display text-lg text-ink truncate">{p.name}</h3>
              </div>
              {canWrite && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => setEditing(p)} className="btn-ghost p-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>
                    </svg>
                  </button>
                  <button onClick={() => onDelete(p)} className="btn-ghost p-1.5 hover:text-signal-brick">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              )}
            </div>
            {p.description && <p className="text-sm text-muted mt-2.5 line-clamp-2 leading-relaxed">{p.description}</p>}
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint mt-4 pt-3 border-t border-line">
              Created {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
            </p>
          </div>
        ))}
        {data && data.items.length === 0 && (
          <div className="col-span-full text-center py-16 font-display italic text-faint">
            No projects yet.
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
        <div className="flex gap-2 justify-end pt-3 border-t border-line mt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={creating || updating} className="btn-primary">
            {(creating || updating) ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
