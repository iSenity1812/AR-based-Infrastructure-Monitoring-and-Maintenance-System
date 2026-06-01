# Identity Service (MVP)

Standalone NestJS service providing centralized authentication and capabilities-based authorization for the control plane.

## Quick start

1. Ensure MongoDB is running.
2. From this directory:

```bash
pnpm dev
```

## Seed (idempotent)

Seeds core capabilities, default roles, and a bootstrap admin user:

```bash
pnpm seed
```

Running `pnpm seed` multiple times is safe (no duplicate records).

## Environment

Copy `.env.example` → `.env` and adjust as needed.

- `MONGO_URI` (default: `mongodb://localhost:27017/identity_db`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL_SECONDS` (default: 900)
- `JWT_REFRESH_TTL_SECONDS` (default: 2592000)
- `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`

## Endpoints

Public:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Protected:

- `GET /auth/me`
- `GET /roles`
- `POST /admin/users`
- `PATCH /admin/users/:id/status`
- `PUT /admin/users/:id/roles`

All responses use the envelope `{ data, meta }`. Errors use `{ error }`.

