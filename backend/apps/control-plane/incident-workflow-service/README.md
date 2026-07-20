# Incident Workflow Service

Service control-plane cho ticket và incident workflow.

## Current scope

- Health endpoint
- API envelope response
- Ticket lifecycle, assignment, acknowledge, comments, and activity timeline
- Evidence metadata and object-storage reference tracking
- MongoDB persistence for ticket and incident workflows

## Endpoints

- `GET /api/v1/health`
- `POST /api/v1/tickets`
- `GET /api/v1/tickets`
- `GET /api/v1/tickets/:id`
- `PATCH /api/v1/tickets/:id/status`
- `PATCH /api/v1/tickets/:id/assignment`
- `POST /api/v1/tickets/:id/acknowledge`
- `POST /api/v1/tickets/:id/comments`
- `POST /api/v1/tickets/:id/evidence`
- `POST /api/v1/tickets/:id/evidence/upload-url`
- `GET /api/v1/tickets/:id/evidence`
- `POST /api/v1/incidents`
- `GET /api/v1/incidents`
- `GET /api/v1/incidents/:id`

## Run locally

```bash
pnpm install
pnpm dev
```

Default API prefix: `api/v1`

## Environment

- `PORT`
- `MONGODB_URI`
- `API_PREFIX`
- `SWAGGER_ENABLED`
- `JWT_ACCESS_SECRET` (must match identity-service)
- `R2_ENDPOINT` (preferred; direct S3-compatible Cloudflare R2 endpoint)
- `R2_ACCOUNT_ID` (optional fallback when `R2_ENDPOINT` is omitted)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` (optional public/custom domain base URL)
- `R2_EVIDENCE_PREFIX`
- `R2_PRESIGN_EXPIRES_SECONDS`

## Evidence contract

`POST /api/v1/tickets/:id/evidence` requires
`tickets.evidence.attach`. The request stores metadata only and accepts:

- `type`: `IMAGE`, `NOTE`, `DOCUMENT`, `LINK`, `DIAGNOSTIC_SNAPSHOT`, or `FIELD_EVIDENCE`
- at least one of `storageKey`, `url`, or `note`
- optional `fileName`, `mimeType`, `sizeBytes`, and `metadata`

Binary file content is not stored in MongoDB. Uploading to object storage is owned
by Cloudflare R2 through a presigned upload flow; this endpoint records its stable
reference after the client uploads the file.

## Cloudflare R2 upload flow

`POST /api/v1/tickets/:id/evidence/upload-url` requires
`tickets.evidence.attach` and returns a presigned `PUT` upload target for
Cloudflare R2.

For environment compatibility, the service also accepts these aliases:

- `ACCESS_KEY_ID` -> `R2_ACCESS_KEY_ID`
- `SECRET_ACCESS_KEY` -> `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` -> `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` -> `R2_PUBLIC_BASE_URL`

Suggested client flow:

1. Call `POST /tickets/:id/evidence/upload-url` with `type`, `fileName`, and `mimeType`.
2. Upload the file bytes directly to R2 using the returned `uploadUrl`, HTTP method, and headers.
3. Call `POST /tickets/:id/evidence` with the returned `storageKey` and optional `url`.

`GET /api/v1/tickets/:id/evidence` requires `tickets.read`.

## Verification

```bash
pnpm test
pnpm build
```

The suite includes unit tests and an HTTP e2e workflow using in-memory repository
adapters. MongoDB adapter integration tests remain future work.

## Notes

- The service follows the same control-plane clean architecture style used by the existing Nest services in the repo.
