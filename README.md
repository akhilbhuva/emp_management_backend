# Employee Management Backend

Backend API for an employee task management system. Roles: Team Lead, Project
Manager, Delivery Manager, Employee — all stored in a single `tbl_user` table.

## Tech stack

- Node.js + Express 5 (ES modules — `import`/`export`, not `require`)
- PostgreSQL + Sequelize ORM
- JWT access/refresh token auth (`jsonwebtoken`, `bcryptjs`)
- Socket.io (realtime, scaffolded in `config/socket.js`)

## Database naming convention

- Every table name starts with `tbl_` (e.g. `tbl_role`, `tbl_user`, `tbl_session`).
- Every column is prefixed with its table name (e.g. `tbl_user.user_email`),
  including timestamps (`user_created_at` / `user_updated_at`).
- Boolean-style flags use `Y` / `N`, not `true`/`false` or `active`/`inactive`:
  - `user_status`: `Y` = active, `N` = inactive
  - `session_status`: `Y` = session active (logged in), `N` = ended
  - `<table>_isdeleted` on every table: `Y` = soft-deleted, `N` = not deleted
    (all deletes in this project are soft deletes — rows are flagged, never
    actually removed; each model's `defaultScope` automatically excludes
    `isdeleted = 'Y'` rows from normal queries)

## Tables

| Table          | Purpose                                                             |
|----------------|----------------------------------------------------------------------|
| `tbl_role`     | Lookup table for the 4 roles (`role_id` 1–4)                        |
| `tbl_user`     | All users regardless of role (`user_type`: T/P/D/E)                 |
| `tbl_session`  | One row per login — refresh token, IP address, user agent, status   |

Role IDs: `1` = Team Lead (`T`), `2` = Project Manager (`P`),
`3` = Delivery Manager (`D`), `4` = Employee (`E`).

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or reachable), with a database already created
  (this project does not create the database itself, only its tables)

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy the example env file and fill in your real values:
   ```
   cp .env.example .env
   ```
   Set at minimum: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
   `JWT_SECRET`, `JWT_REFRESH_SECRET` (use long random strings for the two
   JWT secrets — do not reuse the placeholders in production).

   > `.env` is loaded with `override: true`, so it always wins over any
   > same-named variables already set at the OS/session level — no surprise
   > cross-project env var collisions.

3. Make sure the database named in `DB_NAME` already exists in Postgres
   (create it with `CREATE DATABASE your_db_name;` via `psql` or a GUI tool
   if it doesn't).

## Running

```
npm run dev     # development — auto-restarts on file changes
npm start       # run once, no watch (production-style)
```

On every startup the app:
1. Connects to Postgres
2. Syncs Sequelize models to the DB schema (`alter: true` in development —
   creates missing tables/columns; see "Changing the schema" below for its
   limits)
3. Seeds the 4 roles into `tbl_role` (idempotent, safe to run every boot)

### First-time login

There's no public signup route — users are created by a Delivery Manager
through the API. To bootstrap the very first account:

```
npm run seed:admin
```

Creates a Delivery Manager using `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` from `.env` (defaults to
`admin@company.com` / `Admin@123` if unset). Safe to re-run — skips if that
email already exists.

## API

| Method | Route               | Auth                          | Purpose                          |
|--------|---------------------|--------------------------------|-----------------------------------|
| POST   | `/api/auth/login`   | none                            | Log in, returns access+refresh JWT |
| POST   | `/api/auth/refresh` | none (refresh token in body)    | Rotate access+refresh token pair  |
| POST   | `/api/auth/logout`  | none (refresh token in body)    | Ends the session                  |
| GET    | `/api/users`        | Bearer access token             | List users                        |
| POST   | `/api/users`        | Bearer token, Delivery Manager  | Create a new user                 |

Access tokens go in `Authorization: Bearer <token>`. Access tokens are
short-lived (`JWT_EXPIRES_IN`, default 15m); use `/api/auth/refresh` with the
refresh token to get a new pair without logging in again.

## Changing the schema

Sequelize's `alter: true` sync (used automatically in development) can add
new tables/columns, but it **cannot** change an existing ENUM's allowed
values or rename a table. For those cases, drop the affected table(s) and
let the next `npm run dev` recreate them clean:

```sql
DROP TABLE IF EXISTS "tbl_whatever" CASCADE;
DROP TYPE IF EXISTS "enum_tbl_whatever_column_name" CASCADE;
```

This is a dev-only workflow (drops all data in that table) — there's no
migration system in place yet. If the project needs to preserve real data
across schema changes, add `sequelize-cli` migrations instead of relying on
`alter`/manual drops.

## Windows: "running scripts is disabled" error

If `npm run dev` fails with a PowerShell script-execution error, allow local
scripts to run for your user account:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
