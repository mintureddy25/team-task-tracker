# Future work (intentionally out of scope for v1)

Notes captured during the 3-day build that should be folded into the README "What I'd add given more time" section.

## Deletion strategy
- Two-stage delete: soft-delete (`deletedAt`) into a Trash bucket → cron hard-deletes after retention (30–90 days)
- Restore / undelete UI is the prerequisite — without it, soft-delete is dead weight
- GDPR right-to-be-forgotten: bypass retention, anonymize PII on foreign references (`createdBy → "Deleted user"`)
- Immutable audit log table that survives even hard delete

## Messaging / event infrastructure
- Currently using Redis pub/sub for real-time WebSocket fan-out (correct for "ephemeral push hint, DB is the source of truth")
- As the system grows we'll add operations that need **delivery guarantees** (transactional emails, push notifications, export jobs, third-party syncs, scheduled reminders)
- Plan: introduce **RabbitMQ** (work queues, retries, DLQ) or **Kafka** (event streams, replay, consumer groups) alongside Redis
  - Redis pub/sub stays for low-latency real-time UI updates
  - Queue/stream handles "must eventually run" workloads
- Likely first queue consumers: notification email digest, due-date reminder cron, webhook delivery to external integrations

## Other deferred items
- Task comments and attachments
- Activity feed / audit log per task
- Notification preferences (per-type opt-out)
- Search (Elasticsearch / Meilisearch) for full-text on title + description
- Per-user rate limiting (express-rate-limit + Redis)
- Distributed tracing (OpenTelemetry → Jaeger)
- E2E tests with Playwright once a frontend exists
