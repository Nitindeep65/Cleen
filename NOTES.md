# Engineering Notes

## Prisma

Prisma was chosen because the repository defines a relational PostgreSQL model with Equipment, CleaningRecord, and AuditLog relationships, enum status fields, foreign-key restrictions, indexes, and JSON audit changes. Runtime services now use the generated Prisma client, while tests opt into in-memory fixtures for fast deterministic unit coverage. The checked-in schema provides typed client generation, a repeatable migration, and a seed script.

## Pagination

Offset pagination was used because the API contract exposes `page`, `limit`, totals, and navigation flags, and Prisma maps this cleanly to database-level `skip`/`take` plus a matching `count` query. The production query applies identical filters to data and count and uses stable timestamp-plus-ID ordering. Tests use equivalent in-memory fixtures.

The parser defaults to page `1` and limit `10`, accepts limits from `1` through `100`, and rejects the legacy `pageSize` parameter. Prisma queries use database-level pagination and stable timestamp-plus-ID ordering.

## Audit Design

Audit entries are persisted as Prisma `AuditLog` rows keyed by generated UUID. A cleaning-record create records the tracked business fields with `oldValue: null`. An update compares the persisted old record to the updated record and records only changes to `cleanedBy`, `cleanedAt`, `method`, `notes`, and `status`. Equality uses strict equality, Date timestamps, or JSON serialization for structured values. Null and non-null transitions are distinct, no-op updates do not create entries, and record/audit writes share one transaction.

The actor is read from the `x-user-id` request header and defaults to `system`; there is no authentication layer. The server supplies `changedAt`. Audit retrieval is chronological, using timestamp and ID as tie-breakers. The Prisma model stores `changes` as JSON, and record/audit mutations use one Prisma transaction.

## Validation and Architecture Decisions

- The API keeps a service boundary between Express controllers and persistence, making the eventual Prisma replacement localized to the services.
- Boundary validation rejects malformed JSON bodies, empty required strings, invalid dates, invalid status values, empty PATCH bodies, and invalid pagination.
- Equipment codes are enforced as unique by Prisma/PostgreSQL, and equipment with cleaning records cannot be deleted.
- The frontend uses typed API helpers and presents equipment, records, forms, pagination, and audit history.
- The development frontend has a seeded mock fallback for network failures so the UI remains usable during local startup. HTTP API errors are surfaced, and `VITE_DISABLE_MOCK=true` disables fallback entirely.
- The frontend and backend both use port `3000` by default; set `VITE_API_BASE_URL` when using another backend port.
- The repository has no root package script. Commands must be run in the package directory that owns them.

Focused validation performed for this documentation:

- `backend/npm test`: 6 passed.
- `backend/npm run build`: passed.
- `frontend/npm run typecheck`: passed.
- `frontend/npm run build`: passed.
- `backend/npm run prisma:generate`: passed.
- `backend/npm start` on an available alternate port: server started successfully.
- `backend/npx prisma migrate deploy`: passed against the local PostgreSQL database.
- `backend/npm run prisma:seed`: passed against the local PostgreSQL database.

## Improvements With More Time

1. Add authentication and authorization, then derive the audit actor from trusted request context rather than an unauthenticated header.
2. Add API integration and frontend tests, including error states, mock fallback behavior, and the complete create/update/audit workflow.
3. Add a reproducible PostgreSQL development setup or CI service so migration and seed validation can run consistently.

## Intentionally Omitted

- Authentication and authorization are not implemented.
- Equipment create/edit/delete screens are not exposed by the frontend UI.
- A local PostgreSQL instance was not available for migration/seed execution.
- Full end-to-end, browser, and API integration test infrastructure is not included.
- Search is implemented as client-side filtering in the frontend, not as a backend query parameter.

## Known Limitations and Infrastructure Assumptions

- Runtime data is durable only when the configured PostgreSQL database is reachable.
- The Prisma migration and seed assume a reachable PostgreSQL instance, a `cleen` database, and credentials permitted by `DATABASE_URL`. Local access was denied during validation, so successful application of the migration and seed is not claimed.
- The committed local frontend configuration targets `http://localhost:3000/api`; update it if the backend uses another port.
- Development mock fallback can conceal API availability problems unless disabled with `VITE_DISABLE_MOCK=true`.
- The audit actor fallback `system` is suitable only for local development and is not an identity boundary.
- Database-backed audit atomicity still depends on successful PostgreSQL connectivity and migration application.
- The architecture document describes the intended PostgreSQL implementation in places; this repository state should be treated as the source of truth for the limitations above.
