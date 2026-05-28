// Centralized OpenAPI 3.0 spec. Served at:
//   - GET /docs           — Swagger UI
//   - GET /docs/openapi.json — raw spec (importable into Postman)

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Team Task Tracker API',
    version: '1.0.0',
    description:
      'REST API for a team-based task tracker. Auth via JWT (access + refresh ' +
      'rotation), RBAC at middleware level, Redis caching on per-assignee task ' +
      'lists, real-time notifications over SSE.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  tags: [
    { name: 'auth' },
    { name: 'users' },
    { name: 'projects' },
    { name: 'tasks' },
    { name: 'notifications' },
    { name: 'analytics' },
  ],

  // ──────────────────── COMPONENTS ────────────────────
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'code', 'message'],
        properties: {
          status: { type: 'integer', example: 400 },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'dueDate must be a future date' },
          details: { description: 'Optional field-level errors' },
        },
      },
      Role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'MEMBER'] },
      Priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      TaskStatus: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
      NotificationType: {
        type: 'string',
        enum: ['TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_DUE_SOON'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { $ref: '#/components/schemas/Role' },
          orgId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResult: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orgId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdById: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          priority: { $ref: '#/components/schemas/Priority' },
          status: { $ref: '#/components/schemas/TaskStatus' },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          createdById: { type: 'string', format: 'uuid' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { $ref: '#/components/schemas/NotificationType' },
          taskId: { type: 'string', format: 'uuid', nullable: true },
          payload: { type: 'object', additionalProperties: true },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],

  // ──────────────────── PATHS ────────────────────
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        security: [],
        summary: 'Liveness probe',
        responses: { 200: { description: 'OK' } },
      },
    },

    // ─── auth ───
    '/auth/register': {
      post: {
        tags: ['auth'],
        security: [],
        summary: 'Register a brand-new organization (caller becomes ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'orgName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  orgName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } },
          },
          409: { description: 'Email already exists', content: jsonError() },
          400: { description: 'Validation error', content: jsonError() },
        },
      },
    },
    '/auth/invite': {
      post: {
        tags: ['auth'],
        summary: 'Invite a new user into the caller\'s org (ADMIN only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  role: { $ref: '#/components/schemas/Role' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } },
          },
          403: { description: 'Not ADMIN', content: jsonError() },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        security: [],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } },
          },
          401: { description: 'Invalid credentials', content: jsonError() },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['auth'],
        security: [],
        summary: 'Rotate refresh token → new access + refresh pair',
        description:
          'Reuse of a revoked refresh token revokes the ENTIRE chain ' +
          '(OWASP defence against stolen tokens). After such an event the user ' +
          'must log in again on all devices.',
        requestBody: refreshBody(),
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid / expired / reused', content: jsonError() },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['auth'],
        security: [],
        summary: 'Revoke a refresh token',
        requestBody: refreshBody(),
        responses: { 204: { description: 'Revoked' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Current user (from JWT)',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    },

    // ─── users ───
    '/users': {
      get: {
        tags: ['users'],
        summary: 'List users in your org',
        parameters: [pageParam(), limitParam(), { name: 'role', in: 'query', schema: { $ref: '#/components/schemas/Role' } }],
        responses: { 200: { description: 'OK', content: pagedJson('User') } },
      },
    },
    '/users/{id}': {
      parameters: [idParam()],
      get: {
        tags: ['users'],
        summary: 'Get one user',
        responses: { 200: { description: 'OK', content: jsonRef('User') } },
      },
      delete: {
        tags: ['users'],
        summary: 'Hard-delete a user (ADMIN). Reassigns their tasks/projects to caller.',
        responses: {
          204: { description: 'Deleted' },
          422: { description: 'Cannot delete last ADMIN', content: jsonError() },
        },
      },
    },
    '/users/{id}/role': {
      parameters: [idParam()],
      patch: {
        tags: ['users'],
        summary: 'Change user role (ADMIN). Cannot demote last ADMIN or change own role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: { role: { $ref: '#/components/schemas/Role' } },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: jsonRef('User') } },
      },
    },

    // ─── projects ───
    '/projects': {
      get: {
        tags: ['projects'],
        summary: 'List projects in your org',
        parameters: [pageParam(), limitParam()],
        responses: { 200: { description: 'OK', content: pagedJson('Project') } },
      },
      post: {
        tags: ['projects'],
        summary: 'Create a project (ADMIN, MANAGER)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', content: jsonRef('Project') } },
      },
    },
    '/projects/{id}': {
      parameters: [idParam()],
      get: { tags: ['projects'], summary: 'Get one project', responses: { 200: { description: 'OK', content: jsonRef('Project') } } },
      patch: {
        tags: ['projects'],
        summary: 'Update project (ADMIN, MANAGER)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: jsonRef('Project') } },
      },
      delete: {
        tags: ['projects'],
        summary: 'Delete project (ADMIN, MANAGER) — cascades to tasks',
        responses: { 204: { description: 'Deleted' } },
      },
    },

    // ─── tasks ───
    '/tasks': {
      get: {
        tags: ['tasks'],
        summary: 'List tasks (filterable; MEMBER sees only their assigned tasks)',
        parameters: [
          pageParam(),
          limitParam(),
          { name: 'status',     in: 'query', schema: { $ref: '#/components/schemas/TaskStatus' } },
          { name: 'priority',   in: 'query', schema: { $ref: '#/components/schemas/Priority' } },
          {
            name: 'assigneeId',
            in: 'query',
            description: 'UUID, or the literals "me" or "unassigned"',
            schema: { type: 'string' },
          },
          { name: 'projectId',  in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'OK', content: pagedJson('Task') } },
      },
      post: {
        tags: ['tasks'],
        summary: 'Create a task (ADMIN, MANAGER)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title'],
                properties: {
                  projectId:   { type: 'string', format: 'uuid' },
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  priority:    { $ref: '#/components/schemas/Priority' },
                  assigneeId:  { type: 'string', format: 'uuid', nullable: true },
                  dueDate:     { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', content: jsonRef('Task') } },
      },
    },
    '/tasks/{id}': {
      parameters: [idParam()],
      get:   { tags: ['tasks'], summary: 'Get one task', responses: { 200: { description: 'OK', content: jsonRef('Task') } } },
      patch: {
        tags: ['tasks'],
        summary: 'Update task fields (MEMBER may edit only own task; cannot reassign)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  description: { type: 'string', nullable: true },
                  priority:    { $ref: '#/components/schemas/Priority' },
                  assigneeId:  { type: 'string', format: 'uuid', nullable: true },
                  dueDate:     { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: jsonRef('Task') } },
      },
      delete: { tags: ['tasks'], summary: 'Delete task (ADMIN, MANAGER)', responses: { 204: { description: 'Deleted' } } },
    },
    '/tasks/{id}/status': {
      parameters: [idParam()],
      patch: {
        tags: ['tasks'],
        summary: 'Advance task status (assignee or MANAGER/ADMIN only)',
        description:
          'Enforced transitions: TODO → IN_PROGRESS → IN_REVIEW → DONE. ' +
          'BLOCKED is reachable from any active state and can return to any active state. ' +
          'DONE is terminal.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { $ref: '#/components/schemas/TaskStatus' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: jsonRef('Task') },
          422: { description: 'Invalid transition', content: jsonError() },
        },
      },
    },

    // ─── notifications ───
    '/notifications': {
      get: {
        tags: ['notifications'],
        summary: 'List my notifications',
        parameters: [
          pageParam(),
          limitParam(),
          { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    unreadCount: { type: 'integer' },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/notifications/{id}/read': {
      parameters: [idParam()],
      patch: { tags: ['notifications'], summary: 'Mark one as read', responses: { 200: { description: 'OK', content: jsonRef('Notification') } } },
    },
    '/notifications/read-all': {
      patch: { tags: ['notifications'], summary: 'Mark all as read', responses: { 200: { description: 'OK' } } },
    },
    '/notifications/stream': {
      get: {
        tags: ['notifications'],
        security: [],
        summary: 'Server-Sent Events stream of real-time notifications',
        description:
          'Auth via ?token=<jwt> query param (EventSource cannot set headers). ' +
          'Emits events: `connected` (once on open), `notification` (per push). ' +
          'Heartbeat comment every 25s.',
        parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'SSE stream (text/event-stream)' } },
      },
    },

    // ─── analytics ───
    '/analytics/users': {
      get: {
        tags: ['analytics'],
        summary: 'Per-user performance metrics (ADMIN, MANAGER)',
        description:
          'Returns one row per org member: overdue/open/done counts, avg completion ' +
          'time (hours), and rank within org by completion count (window function).',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          userId:              { type: 'string', format: 'uuid' },
                          name:                { type: 'string' },
                          email:               { type: 'string', format: 'email' },
                          role:                { $ref: '#/components/schemas/Role' },
                          overdueCount:        { type: 'integer' },
                          openCount:           { type: 'integer' },
                          doneCount:           { type: 'integer' },
                          avgCompletionHours:  { type: 'number', nullable: true },
                          completionRankInOrg: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

// ──────────────────── helpers ────────────────────

function idParam() {
  return { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
}
function pageParam() {
  return { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } };
}
function limitParam() {
  return { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } };
}
function jsonError() {
  return { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };
}
function jsonRef(name: string) {
  return { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } };
}
function pagedJson(itemName: string) {
  return {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: `#/components/schemas/${itemName}` } },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
    },
  };
}
function refreshBody() {
  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
  };
}
