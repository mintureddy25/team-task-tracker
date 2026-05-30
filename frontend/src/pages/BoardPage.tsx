import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow, isPast } from 'date-fns';
import { useAppSelector } from '../app/hooks';
import {
  useListTasksQuery,
  useListProjectsQuery,
  useListUsersQuery,
  useCreateTaskMutation,
  useChangeTaskStatusMutation,
  useDeleteTaskMutation,
} from '../app/api';
import Modal from '../components/Modal';
import {
  type Task, type TaskStatus, type Priority,
  TASK_STATUSES, PRIORITIES,
} from '../lib/types';
import { extractErrorMessage } from '../lib/errors';

const STATUS_META: Record<TaskStatus, { label: string; dot: string }> = {
  TODO:        { label: 'To Do',       dot: 'bg-signal-stone' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-signal-cobalt' },
  IN_REVIEW:   { label: 'In Review',   dot: 'bg-signal-ochre' },
  DONE:        { label: 'Done',        dot: 'bg-signal-moss' },
  BLOCKED:     { label: 'Blocked',     dot: 'bg-signal-brick' },
};

export default function BoardPage() {
  const me = useAppSelector(s => s.auth.user);
  const canCreate = me?.role === 'ADMIN' || me?.role === 'MANAGER';

  const [projectFilter, setProjectFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: tasksData } = useListTasksQuery({
    limit: 100,
    ...(projectFilter ? { projectId: projectFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter as Priority } : {}),
    ...(assigneeFilter ? { assigneeId: assigneeFilter } : {}),
  });
  const { data: projects } = useListProjectsQuery({ limit: 100 });
  const { data: users } = useListUsersQuery({ limit: 100 });

  const grouped = useMemo(() => {
    const empty: Record<TaskStatus, Task[]> = {
      TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], BLOCKED: [],
    };
    for (const t of tasksData?.items ?? []) empty[t.status].push(t);
    return empty;
  }, [tasksData]);

  const total = tasksData?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap animate-fade-up">
        <div>
          <div className="eyebrow">01 — Workspace</div>
          <h1 className="font-display text-4xl text-ink mt-1">Task Board</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-2">
            {total} task{total === 1 ? '' : 's'} across {TASK_STATUSES.length} columns
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <span className="text-base leading-none">+</span> New Task
          </button>
        )}
      </header>

      <div className="card flex gap-4 flex-wrap items-end animate-fade-up" style={{ animationDelay: '60ms' }}>
        <FilterSelect
          label="Project" value={projectFilter} onChange={setProjectFilter}
          options={[{ v: '', l: 'All projects' }, ...(projects?.items ?? []).map(p => ({ v: p.id, l: p.name }))]}
        />
        <FilterSelect
          label="Priority" value={priorityFilter} onChange={v => setPriorityFilter(v as Priority | '')}
          options={[{ v: '', l: 'All' }, ...PRIORITIES.map(p => ({ v: p, l: p }))]}
        />
        <FilterSelect
          label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter}
          options={[
            { v: '', l: 'All' },
            { v: 'me', l: 'My tasks' },
            { v: 'unassigned', l: 'Unassigned' },
            ...(users?.items ?? []).map(u => ({ v: u.id, l: u.name })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {TASK_STATUSES.map((status, i) => (
          <div key={status} className="animate-fade-up" style={{ animationDelay: `${120 + i * 70}ms` }}>
            <Column
              status={status}
              tasks={grouped[status]}
              users={users?.items ?? []}
            />
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          projects={projects?.items ?? []}
          users={users?.items ?? []}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input min-w-[160px]">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Column({ status, tasks, users }: { status: TaskStatus; tasks: Task[]; users: { id: string; name: string }[] }) {
  const meta = STATUS_META[status];
  return (
    <div className="bg-bone/60 rounded-card border border-line flex flex-col min-h-[220px]">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-line">
        <span className={clsx('dot', meta.dot)} />
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">{meta.label}</h3>
        <span className="ml-auto font-mono text-[11px] text-faint">{String(tasks.length).padStart(2, '0')}</span>
      </div>
      <div className="p-2 space-y-2 flex-1">
        {tasks.length === 0 && (
          <div className="text-center font-display italic text-sm text-faint/70 py-6">empty</div>
        )}
        {tasks.map(t => <TaskCard key={t.id} task={t} users={users} />)}
      </div>
    </div>
  );
}

function TaskCard({ task, users }: { task: Task; users: { id: string; name: string }[] }) {
  const me = useAppSelector(s => s.auth.user);
  const [changeStatus] = useChangeTaskStatusMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const canMove = me?.role !== 'MEMBER' || task.assigneeId === me?.id;
  const canDelete = me?.role === 'ADMIN' || me?.role === 'MANAGER';

  const assignee = users.find(u => u.id === task.assigneeId);
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

  async function moveTo(s: TaskStatus) {
    try {
      await changeStatus({ id: task.id, status: s }).unwrap();
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }
  async function onDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteTask(task.id).unwrap();
      toast.success('Task deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  return (
    <div className="bg-bone border border-line rounded-card p-3 shadow-card transition-all duration-150
                    hover:-translate-y-0.5 hover:shadow-card-hover hover:border-line-strong group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink leading-snug">{task.title}</p>
        {canDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-faint hover:text-signal-brick transition shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={clsx('chip', priorityChip(task.priority))}>{task.priority}</span>
        {task.dueDate && (
          <span className={clsx('font-mono text-[10px] uppercase tracking-wide',
            overdue ? 'text-signal-brick font-semibold' : 'text-faint')}>
            {overdue ? '⚠ ' : ''}{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
          </span>
        )}
        {assignee && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted truncate" title={assignee.name}>
            <span className="w-4 h-4 rounded-full bg-ink/[0.08] grid place-items-center font-mono text-[9px] text-ink-soft uppercase">
              {assignee.name.charAt(0)}
            </span>
            <span className="truncate max-w-[80px]">{assignee.name}</span>
          </span>
        )}
      </div>
      {canMove && (
        <select
          value={task.status}
          onChange={e => moveTo(e.target.value as TaskStatus)}
          className="input mt-2.5 text-xs py-1.5 font-mono"
        >
          {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      )}
    </div>
  );
}

function priorityChip(p: Priority) {
  return p === 'HIGH'
    ? 'chip-brick'
    : p === 'MEDIUM'
      ? 'chip-ochre'
      : 'chip-stone';
}

function CreateTaskModal({
  onClose, projects, users,
}: {
  onClose: () => void;
  projects: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    title: '',
    description: '',
    priority: 'MEDIUM' as Priority,
    assigneeId: '',
    dueDate: '',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTask({
        projectId: form.projectId,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      }).unwrap();
      toast.success('Task created');
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err as never));
    }
  }

  if (!form.projectId) {
    return (
      <Modal open onClose={onClose} title="Create task">
        <p className="text-sm text-muted">Create a project first.</p>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title="Create task">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Project</label>
          <select required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="input">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })} className="input">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} className="input">
            <option value="">— Unassigned —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-line mt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
