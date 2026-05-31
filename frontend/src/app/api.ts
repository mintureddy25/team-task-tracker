// RTK Query base — JWT injection + automatic refresh-token rotation on 401.

import {
  type BaseQueryFn,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';
import { logout, setTokens, setCredentials } from '../features/auth/authSlice';
import type { RootState } from './store';

const rawBaseQuery = fetchBaseQuery({
  // Dev: '/api' → Vite proxy strips the prefix → backend. Prod: absolute API base.
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

let refreshing: Promise<boolean> | null = null;

// Wraps the base query: on a 401, attempts ONE refresh-token rotation,
// then retries the original request once.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) {
      api.dispatch(logout());
      return result;
    }

    // Coalesce concurrent refreshes — only one in-flight at a time
    refreshing ??= (async () => {
      const r = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        api,
        extraOptions,
      );
      if (r.data) {
        const { accessToken, refreshToken: newRefresh } = r.data as {
          accessToken: string;
          refreshToken: string;
        };
        api.dispatch(setTokens({ accessToken, refreshToken: newRefresh }));
        return true;
      }
      api.dispatch(logout());
      return false;
    })().finally(() => {
      refreshing = null;
    });

    const ok = await refreshing;
    if (ok) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tasks', 'Task', 'Projects', 'Project', 'Users', 'Notifications', 'Analytics', 'Me'],
  endpoints: builder => ({
    // ─── auth ───
    register: builder.mutation<
      { accessToken: string; refreshToken: string; user: import('../lib/types').User },
      { email: string; password: string; name: string; orgName: string }
    >({
      query: body => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    login: builder.mutation<
      { accessToken: string; refreshToken: string; user: import('../lib/types').User },
      { email: string; password: string }
    >({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    invite: builder.mutation<
      { accessToken: string; refreshToken: string; user: import('../lib/types').User },
      { email: string; password: string; name: string; role: import('../lib/types').Role }
    >({
      query: body => ({ url: '/auth/invite', method: 'POST', body }),
      // New member appears as a (zero-task) row in Analytics.
      invalidatesTags: ['Users', 'Analytics'],
    }),
    logout: builder.mutation<void, void>({
      queryFn: async (_arg, api) => {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (refreshToken) {
          await rawBaseQuery(
            { url: '/auth/logout', method: 'POST', body: { refreshToken } },
            api,
            {},
          );
        }
        api.dispatch(logout());
        return { data: undefined };
      },
    }),
    me: builder.query<{ user: import('../lib/types').User }, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),

    // ─── users ───
    listUsers: builder.query<
      import('../lib/types').Paginated<import('../lib/types').User>,
      { page?: number; limit?: number; role?: import('../lib/types').Role } | void
    >({
      query: q => ({ url: '/users', params: q || {} }),
      providesTags: ['Users'],
    }),
    updateUserRole: builder.mutation<
      import('../lib/types').User,
      { id: string; role: import('../lib/types').Role }
    >({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: 'PATCH', body: { role } }),
      // Role is displayed in the Analytics table.
      invalidatesTags: ['Users', 'Analytics'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: id => ({ url: `/users/${id}`, method: 'DELETE' }),
      // Removing a user reassigns their tasks/projects and changes every aggregate.
      invalidatesTags: ['Users', 'Tasks', 'Projects', 'Analytics', 'Notifications'],
    }),

    // ─── projects ───
    listProjects: builder.query<
      import('../lib/types').Paginated<import('../lib/types').Project>,
      { page?: number; limit?: number } | void
    >({
      query: q => ({ url: '/projects', params: q || {} }),
      providesTags: ['Projects'],
    }),
    getProject: builder.query<import('../lib/types').Project, string>({
      query: id => `/projects/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<
      import('../lib/types').Project,
      { name: string; description?: string }
    >({
      query: body => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: builder.mutation<
      import('../lib/types').Project,
      { id: string; name?: string; description?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Projects', { type: 'Project', id }],
    }),
    deleteProject: builder.mutation<void, string>({
      query: id => ({ url: `/projects/${id}`, method: 'DELETE' }),
      // Cascade-deletes child tasks, so per-user aggregates shift too.
      invalidatesTags: ['Projects', 'Tasks', 'Analytics'],
    }),

    // ─── tasks ───
    listTasks: builder.query<
      import('../lib/types').Paginated<import('../lib/types').Task>,
      {
        page?: number;
        limit?: number;
        status?: import('../lib/types').TaskStatus;
        priority?: import('../lib/types').Priority;
        assigneeId?: string;
        projectId?: string;
      } | void
    >({
      query: q => ({ url: '/tasks', params: q || {} }),
      providesTags: ['Tasks'],
    }),
    getTask: builder.query<import('../lib/types').Task, string>({
      query: id => `/tasks/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<
      import('../lib/types').Task,
      {
        projectId: string;
        title: string;
        description?: string;
        priority?: import('../lib/types').Priority;
        assigneeId?: string | null;
        dueDate?: string;
      }
    >({
      query: body => ({ url: '/tasks', method: 'POST', body }),
      // A new task shifts per-user counts (Analytics) and may notify the assignee.
      invalidatesTags: ['Tasks', 'Analytics', 'Notifications'],
    }),
    updateTask: builder.mutation<
      import('../lib/types').Task,
      {
        id: string;
        title?: string;
        description?: string | null;
        priority?: import('../lib/types').Priority;
        assigneeId?: string | null;
        dueDate?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      // Priority/assignee/due-date edits change overdue + per-user aggregates.
      invalidatesTags: (_r, _e, { id }) => ['Tasks', { type: 'Task', id }, 'Analytics'],
    }),
    changeTaskStatus: builder.mutation<
      import('../lib/types').Task,
      { id: string; status: import('../lib/types').TaskStatus }
    >({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      // Status drives open/done/avg-completion in Analytics and notifies the assignee.
      invalidatesTags: (_r, _e, { id }) => ['Tasks', { type: 'Task', id }, 'Analytics', 'Notifications'],
    }),
    deleteTask: builder.mutation<void, string>({
      query: id => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tasks', 'Analytics'],
    }),

    // ─── notifications ───
    listNotifications: builder.query<
      import('../lib/types').NotificationsList,
      { page?: number; limit?: number; unreadOnly?: boolean } | void
    >({
      query: q => ({
        url: '/notifications',
        params: {
          ...(q?.page ? { page: q.page } : {}),
          ...(q?.limit ? { limit: q.limit } : {}),
          ...(q?.unreadOnly ? { unreadOnly: 'true' } : {}),
        },
      }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<import('../lib/types').Notification, string>({
      query: id => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),

    // ─── analytics ───
    getAnalytics: builder.query<{ items: import('../lib/types').AnalyticsRow[] }, void>({
      query: () => '/analytics/users',
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useInviteMutation,
  useLogoutMutation,
  useMeQuery,
  useListUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useChangeTaskStatusMutation,
  useDeleteTaskMutation,
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetAnalyticsQuery,
} = api;
