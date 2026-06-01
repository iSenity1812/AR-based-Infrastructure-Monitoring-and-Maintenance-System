# Telemetry Debug Backend

Small local backend to verify the Go collector agent end to end.

Default address

- `127.0.0.1:8080`

Run

```bash
go run ./cmd/server
```

Endpoints

- `GET /healthz`
- `POST /api/telemetry/ingest`
- `GET /api/telemetry/stats`
- `GET /api/telemetry/batches?limit=10`
- `GET /api/telemetry/fail-mode`
- `POST /api/telemetry/fail-mode`

`/api/telemetry/batches` returns full metric records now, so you can inspect actual `value`, `unit`, `timestamp`, and `tags` for each batch directly.

Example fail mode request

```json
{
  "statusCode": 503,
  "message": "temporary outage",
  "remaining": 2
}
```

This lets you force the next 2 ingest requests to fail so the agent retry and buffer behavior can be observed.
