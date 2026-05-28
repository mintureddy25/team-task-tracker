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

const STATUS_META: Record<TaskStatus, { label: string; bar: string }> = {
  TODO:        { label: 'To Do',       bar: 'bg-slate-500' },
  IN_PROGRESS: { label: 'In Progress', bar: 'bg-blue-500' },
  IN_REVIEW:   { label: 'In Review',   bar: 'bg-amber-500' },
  DONE:        { label: 'Done',        bar: 'bg-emerald-500' },
  BLOCKED:     { label: 'Blocked',     bar: 'bg-red-500' },
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Task Board</h1>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + New Task
          </button>
        )}
      </div>

      <div className="card flex gap-3 flex-wrap items-end">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {TASK_STATUSES.map(status => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            users={users?.items ?? []}
          />
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
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col min-h-[200px]">
      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
        <span className={clsx('w-2 h-2 rounded-full', meta.bar)} />
        <h3 className="text-sm font-medium text-slate-200">{meta.label}</h3>
        <span className="ml-auto text-xs text-slate-500">{tasks.length}</span>
      </div>
      <div className="p-2 space-y-2 flex-1">
        {tasks.length === 0 && (
          <div className="text-center text-xs text-slate-600 py-4">Empty</div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-100">{task.title}</p>
        {canDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 text-xs">
        <span className={clsx('chip', priorityChip(task.priority))}>{task.priority}</span>
        {task.dueDate && (
          <span className={clsx('text-slate-500', overdue && 'text-red-400 font-medium')}>
            {overdue ? '⚠ ' : ''}{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
          </span>
        )}
        {assignee && (
          <span className="ml-auto text-slate-500 truncate" title={assignee.name}>
            {assignee.name}
          </span>
        )}
      </div>
      {canMove && (
        <select
          value={task.status}
          onChange={e => moveTo(e.target.value as TaskStatus)}
          className="input mt-2 text-xs py-1"
        >
          {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      )}
    </div>
  );
}

function priorityChip(p: Priority) {
  return p === 'HIGH'
    ? 'bg-red-500/15 text-red-300'
    : p === 'MEDIUM'
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-slate-700/40 text-slate-400';
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
        <p className="text-sm text-slate-400">Create a project first.</p>
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
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
