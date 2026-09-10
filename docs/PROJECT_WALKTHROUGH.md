# CLEEN Project Walkthrough

This document explains the CLEEN Equipment Cleaning Log project from requirements to final verification. It is written as a project handoff and interview-preparation guide: what was built, why it was built, which problems appeared, how they were diagnosed, and how they were fixed.

## 1. What the Assignment Asked For

CLEEN is an internal pharmaceutical operations application for tracking equipment cleaning.

The required stack was:

- Backend: Node.js, TypeScript, Express
- Database: PostgreSQL with Prisma ORM
- Frontend: React and TypeScript

The required domain entities were:

- `Equipment`
- `CleaningRecord`
- `AuditLog`

The main business workflow is:

```text
Create Equipment
      |
      v
Create Cleaning Record
      |
      v
Create Audit Entry
      |
      v
Edit Cleaning Record
      |
      v
Calculate field-level differences
      |
      v
Create another Audit Entry
      |
      v
Display Audit History
```

The most important evaluation areas were accurate audit history, correct pagination, clean typed code, meaningful tests, database setup, and clear documentation.

## 2. Final Repository Structure

```text
Take home/
|
|-- backend/
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   |-- src/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   |-- app.ts
|   |   |-- prisma.ts
|   |   |-- server.ts
|   |   `-- types.ts
|   `-- test/
|       |-- audit.test.ts
|       `-- pagination.test.ts
|-- frontend/
|   `-- src/
|       |-- App.tsx
|       |-- services/api.ts
|       `-- types.ts
|-- docs/
|   |-- ARCHITECTURE.md
|   `-- PROJECT_WALKTHROUGH.md
|-- README.md
`-- NOTES.md
```

## 3. Phase 1: Requirements and Architecture

### What was done

The architecture was documented before implementation. It defines:

- The three entities and their fields.
- The relationship `Equipment -> CleaningRecord -> AuditLog`.
- REST routes and response formats.
- Pagination metadata.
- Audit rules.
- Validation and error behavior.
- Frontend responsibilities.
- Testing strategy.
- Implementation order and known risks.

### Important architecture decisions

1. Equipment codes are unique.
2. Cleaning records belong to one equipment item.
3. Audit logs belong to one cleaning record.
4. Audit changes are stored as structured JSON.
5. Only mutable cleaning-record business fields are audited:
   - `cleanedBy`
   - `cleanedAt`
   - `method`
   - `notes`
   - `status`
6. IDs, relationship fields, audit metadata, and automatic timestamps are not included in field diffs.
7. Pagination uses offset pagination with `page` and `limit`.
8. Audit history is returned in chronological order.

## 4. Phase 2: Database and Prisma

### Database schema

`backend/prisma/schema.prisma` defines:

### Equipment

- UUID primary key
- `name`
- unique `code`
- enum `status`
- `createdAt`
- `updatedAt`

### CleaningRecord

- UUID primary key
- `equipmentId` foreign key
- `cleanedBy`
- `cleanedAt`
- `method`
- nullable `notes`
- enum `status`
- timestamps

### AuditLog

- UUID primary key
- `cleaningRecordId` foreign key
- `changedBy`
- `changedAt`
- JSON `changes`

### Indexes and constraints

Indexes were added for:

- Equipment status.
- Cleaning records by equipment and cleaning date.
- Cleaning records by equipment, status, and cleaning date.
- Audit logs by cleaning record and timestamp.

Foreign keys enforce the entity relationships. Equipment with cleaning records cannot be deleted because the relationship uses restricted deletion. Audit logs are deleted with their cleaning record.

### Migration and seed

The initial migration is located at:

`backend/prisma/migrations/20260908120000_init/migration.sql`

The seed script:

1. Clears existing audit logs, cleaning records, and equipment.
2. Creates Reactor A.
3. Creates a related cleaning record.
4. Creates the corresponding create audit entry.
5. Creates Mixer B.

The seed is deterministic and safe to rerun for local development.

## 5. Phase 3: Express Backend Foundation

The backend uses a conventional separation:

- Routes define URLs and middleware order.
- Controllers translate HTTP requests into service calls.
- Services own business behavior and persistence calls.
- Middleware validates input and formats errors.
- Prisma owns database access.

The API includes:

```text
GET    /health
GET    /api/equipment
GET    /api/equipment/:id
POST   /api/equipment
PATCH  /api/equipment/:id
DELETE /api/equipment/:id
GET    /api/equipment/:equipmentId/cleaning-records
POST   /api/equipment/:equipmentId/cleaning-records
GET    /api/cleaning-records/:id
PATCH  /api/cleaning-records/:id
GET    /api/cleaning-records/:id/audit
```

Errors use a consistent JSON shape:

```json
{
  "error": {
    "message": "Human-readable error"
  }
}
```

## 6. Phase 4: Cleaning Records and Audit Trail

### Diff engine

The reusable function is:

```text
calculateChanges(oldRecord, newRecord)
```

It compares only approved business fields and returns entries shaped like:

```json
{
  "field": "status",
  "oldValue": "IN_PROGRESS",
  "newValue": "COMPLETED"
}
```

### Create behavior

When a record is created, each tracked field is compared with an empty old record. The old value is represented as `null`.

### Update behavior

When a record is updated:

1. The old record is loaded from the database.
2. The requested mutable fields are applied.
3. The diff is calculated from old to new.
4. The record and audit entry are written in one Prisma transaction.

The client cannot provide its own audit changes or old values.

### No-op behavior

If an update does not change any tracked field, no empty audit entry is created.

### Audit retrieval

Audit history is returned in ascending timestamp order. The audit ID is used as a tie-breaker when two events share the same timestamp.

## 7. Phase 5: Pagination

The cleaning-record endpoint accepts:

```text
?page=1&limit=10&status=IN_PROGRESS
```

The response includes:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Production queries use:

- Database-level filtering.
- Database-level `count`.
- `skip = (page - 1) * limit`.
- `take = limit`.
- Stable ordering by timestamp and ID.

The count query and data query use the same filters so pagination metadata cannot disagree with returned data.

Invalid pagination is rejected:

- `page` must be a positive integer.
- `limit` must be between 1 and 100.
- The old `pageSize` parameter is rejected.

## 8. Phase 6: Frontend

The React frontend provides:

- Equipment list.
- Equipment search and status filtering.
- Equipment selection.
- Cleaning-record table.
- Pagination controls.
- Cleaning-record create form.
- Cleaning-record edit form.
- Audit history timeline.
- Loading states.
- Empty states.
- Error and retry states.

The frontend API client is typed and uses the backend URL from `VITE_API_BASE_URL`.

Development network failures may use seeded read-only mock data, but mutation requests do not silently fall back to fake success. HTTP errors are shown to the user.

## 9. Problems Encountered and Fixes

### Problem 1: The repository started as an in-memory prototype

#### Symptom

The first backend implementation stored equipment, cleaning records, and audit logs in JavaScript `Map` objects. Data disappeared whenever the process restarted, and PostgreSQL was not used by runtime services.

#### Fix

- Added Prisma runtime client setup.
- Added Prisma-backed Equipment service.
- Added Prisma-backed CleaningRecord service.
- Added Prisma-backed Audit service.
- Kept memory mode only for deterministic unit tests.

### Problem 2: Prisma was installed but environment variables were not loaded

#### Symptom

The schema validated only when the shell already had `DATABASE_URL`. Starting the API could result in database requests failing because `.env` was not automatically loaded.

#### Fix

- Added `dotenv`.
- Added `import 'dotenv/config'` before Prisma initialization.
- Added `DATABASE_URL` to the environment example.

### Problem 3: The local PostgreSQL role did not match the example URL

#### Symptom

The initial connection used the placeholder role `postgres`, but the local PostgreSQL server had no `postgres` role. Prisma returned `P1010` access errors.

#### Diagnosis

The server was healthy, but its roles showed `nitindeep` as the available superuser.

#### Fix

- Created the local `cleen` database.
- Used the ignored local URL with the available `nitindeep` role.
- Applied the migration.
- Ran the seed successfully.

The committed example remains a safe placeholder; each developer must use credentials valid on their own machine.

### Problem 4: Audit changes were accepted from the client

#### Symptom

The client could submit arbitrary `changes`, which meant audit history could be inaccurate.

#### Fix

- Removed client-controlled audit changes from the input contract.
- Loaded the previous persisted record.
- Calculated old-to-new changes on the server.
- Wrote the record and audit entry transactionally.

### Problem 5: Empty updates created misleading audit entries

#### Symptom

An update with no actual field changes could create an empty audit event.

#### Fix

The service now creates an audit log only when the diff contains at least one changed field.

### Problem 6: Pagination used the wrong parameter and incomplete metadata

#### Symptom

The prototype used `pageSize`, while the assignment required `limit`. It also lacked `hasNextPage` and `hasPreviousPage`.

#### Fix

- Added `limit` parsing.
- Rejected legacy `pageSize`.
- Added total pages and navigation flags.
- Added filtered pagination tests.

### Problem 7: Pagination was accidentally offset twice during the Prisma refactor

#### Symptom

The database query used `skip`, and the shared response formatter also sliced by page. Middle and later pages could return empty or incomplete results.

#### Fix

The formatter now knows whether the database has already paged the result. Database results are returned directly; memory-mode fixtures apply the offset once.

### Problem 8: Audit ordering was reversed

#### Symptom

Audit history was initially returned newest-first, while the documented contract required chronological history.

#### Fix

Audit entries now sort ascending by `changedAt` and then by ID.

### Problem 9: Nullable notes caused TypeScript errors

#### Symptom

The validator allowed `notes: null`, but the TypeScript domain type allowed only strings.

#### Fix

Updated the domain and service types to use `string | null`.

### Problem 10: Unknown request fields were silently persisted

#### Symptom

A request containing an unexpected field could be spread into an in-memory record.

#### Fix

Boundary validation now rejects unknown fields before service execution.

### Problem 11: Malformed UUIDs returned 500 errors

#### Symptom

Invalid route IDs reached Prisma and produced internal errors instead of client validation errors.

#### Fix

Added UUID route-parameter middleware. Invalid IDs now return HTTP 400 with a clear message.

### Problem 12: Production audit actors could be spoofed

#### Symptom

The API accepted arbitrary `x-user-id` headers.

#### Fix

Production ignores client-provided actor headers and uses the server-side fallback. A real authentication system remains a future improvement.

### Problem 13: Frontend mock fallback could fake successful mutations

#### Symptom

When the backend was unavailable, the frontend could create or edit local mock records and appear successful even though nothing was persisted.

#### Fix

Mutation calls now surface the backend error instead of silently creating fake success. Mock fallback remains limited to development read/network behavior.

### Problem 14: Port 3000 was already occupied

#### Symptom

`npm start` failed with `EADDRINUSE` because another process was using port 3000.

#### Fix

Validation used an alternate port such as 3011. The application remains configurable through `PORT` and `VITE_API_BASE_URL`.

### Problem 15: Documentation became stale after implementation progressed

#### Symptom

README, NOTES, and the architecture document still described Prisma as future work and reported migration failure after the local database was successfully configured.

#### Fix

Updated all documents to describe the actual Prisma runtime, successful migration/seed state, and remaining limitations.

## 10. Tests and Validation

### Backend tests

Run from `backend/`:

```sh
npm test
```

The six focused tests cover:

1. One changed audit field.
2. Multiple changed audit fields.
3. Unchanged fields ignored.
4. Null-to-value and value-to-null transitions.
5. Create and update audit behavior.
6. No-op updates.
7. Filtered pagination.
8. Out-of-range pagination.

### Backend build and Prisma

```sh
npm run build
npx prisma validate
npx prisma migrate status
```

Verified results:

- TypeScript compilation passed.
- Prisma schema validation passed.
- Database schema reported up to date.
- Migration applied successfully.
- Seed completed successfully.

### Frontend validation

Run from `frontend/`:

```sh
npm run typecheck
npm run build
```

Both passed.

### Live API checks

The following were verified against the real PostgreSQL-backed server:

- Health endpoint.
- Seeded equipment retrieval.
- Cleaning-record creation.
- Paginated cleaning-record listing.
- Cleaning-record update.
- Chronological audit retrieval.
- Invalid UUID returns 400.
- Unsupported `pageSize` returns 400.

## 11. Remaining Limitations

These are known and intentional, not hidden bugs:

1. There is no authentication system yet. The audit actor convention is suitable for the assignment and local development, but production should derive identity from authenticated session context.
2. The frontend does not expose equipment create/edit/delete screens, although the backend supports equipment CRUD.
3. There are no browser-level frontend tests or full HTTP integration tests yet.
4. Repository Git metadata was not available in the workspace, so tracked-file hygiene could not be independently verified.
5. The local `.env` uses a machine-specific PostgreSQL role and is ignored; another machine must configure its own valid `DATABASE_URL`.

## 12. How to Explain the Project in an Interview

A concise explanation is:

> CLEEN is a typed React and Express application backed by PostgreSQL through Prisma. Equipment has many cleaning records, and each cleaning record has an append-only audit history. Every record mutation loads the previous database state, calculates field-level differences, and writes the record and audit event in one transaction. Cleaning-record listing uses database-level offset pagination with identical filters for count and data queries. The frontend exposes equipment selection, record forms, pagination, filtering, and an audit timeline. The highest-risk areas are covered by focused diff and pagination tests, and the database-backed workflow was verified end to end.
