# CLEEN

CLEEN is a React and Express equipment-cleaning log prototype for pharmaceutical operations. It provides equipment browsing, cleaning-record creation and editing, pagination, status filtering, and field-level audit history.

## Repository Structure

- `backend/`: Express and TypeScript API, Prisma-backed services, schema/migration/seed files, and focused tests.
- `frontend/`: Vite, React, and TypeScript application.
- `docs/ARCHITECTURE.md`: architecture, runtime contracts, and implementation decisions.

## Tech Stack

- Backend: Node.js, Express 4, TypeScript, `tsx`.
- Frontend: React 19, TypeScript, Vite.
- Database: PostgreSQL with Prisma 6.16.2. Runtime services use Prisma; tests explicitly use an in-memory fixture mode.
- Tests: Node's built-in test runner with `tsx`.

## Prerequisites

- Node.js with npm.
- PostgreSQL is required for the Prisma-backed API, migration, and seed commands.
- Ports must be available: backend defaults to `3000`; Vite defaults to `5173`. The checked-in `frontend/.env.local` points the frontend at backend port `3000`.

## Installation

Install dependencies in each package:

```sh
cd backend
npm install
cd ../frontend
npm install
```

## Environment Variables

Backend variables are read from `backend/.env` by Prisma and from the process environment by the Express server. Start from `backend/.env.example`:

```dotenv
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cleen?schema=public"
```

`PORT` is optional and defaults to `3000`. `DATABASE_URL` is required by the Prisma-backed runtime and Prisma commands. `FRONTEND_ORIGIN` is optional; the API defaults CORS to `http://localhost:5173`.

The frontend reads Vite variables at build time:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

This is the current value in `frontend/.env.local`. In development, network failures may use the mock fallback; HTTP API errors are surfaced. Set `VITE_DISABLE_MOCK=true` to disable fallback entirely.

Do not put real credentials in committed files. The values above are safe local examples only.

## Database Setup

The Prisma schema is in `backend/prisma/schema.prisma`, and the initial PostgreSQL migration is in `backend/prisma/migrations/20260908120000_init/`.

From `backend/`:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`prisma:generate`, migration application, and seed execution have been verified locally using the configured PostgreSQL role. Use a role with access to the `cleen` database when setting up another environment.

The seed clears existing audit logs, cleaning records, and equipment, then creates Reactor A with one cleaning record and audit entry plus Mixer B.

## Running the Backend

From `backend/`:

```sh
npm run dev
```

For the built server:

```sh
npm run build
npm start
```

The server exposes `GET /health` and listens on `PORT` or `3000`. The frontend is configured for the default backend port.

## Running the Frontend

From `frontend/`:

```sh
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The development UI calls the configured API first and only uses its mock fallback for network failures unless `VITE_DISABLE_MOCK=true`.

## Validation Commands

Backend, from `backend/`:

```sh
npm test
npm run build
```

Frontend, from `frontend/`:

```sh
npm run typecheck
npm run build
```

The focused backend suite currently contains six passing tests covering field diffs, null transitions, audit creation/update behavior, no-op updates, filtered pagination, and beyond-last-page behavior. The backend build, frontend typecheck/build, and Prisma client generation were also verified. No root-level npm command is available because the repository has no root `package.json`.

## API Overview

All API routes are under `/api`. Errors use `{ "error": { "message": "..." } }` and may include `details`.

### Equipment

- `GET /api/equipment?page=1&limit=10&status=ACTIVE`: paginated equipment list. `status` is optional; `limit` must be 1 through 100.
- `GET /api/equipment/:id`: retrieve equipment.
- `POST /api/equipment`: create equipment with `name` and `code`; `status` defaults to `ACTIVE`.
- `PATCH /api/equipment/:id`: update a non-empty subset of `name`, `code`, and `status`.
- `DELETE /api/equipment/:id`: delete equipment only when it has no cleaning records; returns `204`.

### Cleaning Records

- `GET /api/equipment/:equipmentId/cleaning-records?page=1&limit=10&status=COMPLETED`: list records for an existing equipment item, newest `cleanedAt` first. `status` is optional.
- `POST /api/equipment/:equipmentId/cleaning-records`: create a record with `cleanedBy`, `cleanedAt`, and `method`; `notes` is optional and `status` defaults to `COMPLETED`.
- `GET /api/cleaning-records/:id`: retrieve a record.
- `PATCH /api/cleaning-records/:id`: update a non-empty subset of record fields.
- `GET /api/cleaning-records/:id/audit`: retrieve audit entries for a record in chronological order.

`x-user-id` identifies the actor for record mutations. If it is absent, the backend records `system`.

## Pagination and Audit Trail

List responses have this shape:

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

Pagination uses database-level filtering, counts, `skip`, and `take` in production. Cleaning records are sorted by `cleanedAt` descending with an ID tie-breaker; equipment is sorted by `createdAt` ascending with an ID tie-breaker. Test mode uses equivalent in-memory fixtures.

Creates generate an audit entry. Updates compare persisted values with the proposed values and record only changed `cleanedBy`, `cleanedAt`, `method`, `notes`, and `status` fields. Null values are represented as `null`; no-op updates do not create an audit entry. Audit timestamps are server-generated, and record plus audit writes use one Prisma transaction.

## Troubleshooting

- **`npm` cannot find `package.json`:** run commands from `backend/` or `frontend/`; there is no root package.
- **Frontend shows mock data:** the API request failed and development fallback is enabled. Check that the backend port matches `VITE_API_BASE_URL`, or set `VITE_DISABLE_MOCK=true` to expose the error.
- **CORS errors:** set `FRONTEND_ORIGIN` to the frontend origin, for example `http://localhost:5173`.
- **Port already in use:** set `PORT` to another backend port and update `VITE_API_BASE_URL` accordingly.
- **Prisma `P1010` access denied:** verify that PostgreSQL is running and that the `DATABASE_URL` user has access to the `cleen` database.
- **Data disappears after restart:** verify that the API is using a reachable PostgreSQL database and that `DATABASE_URL` is loaded correctly.
