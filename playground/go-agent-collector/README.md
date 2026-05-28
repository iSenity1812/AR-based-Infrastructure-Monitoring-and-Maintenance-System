# Go Agent Collector

This folder contains the working Go-based collector agent scaffold for node telemetry.

Quick start

1. Install Go 1.20+.
2. Review or update `.env` if you want local overrides.
3. From this directory run:

```bash
go build ./...
go run ./cmd/agent
```

Useful commands

```bash
go test ./...
GO_AGENT_RUN_DURATION=15s go run ./cmd/agent
```

Current runtime behavior

1. Scrape local exporter metrics on `scrape.interval`
2. Parse and normalize metrics into `node.*`
3. Queue normalized metrics in memory
4. Build batch payloads on `send.interval`
5. Send payloads to backend over HTTP
6. Persist retryable failed batches to `data/buffer`
7. Replay buffered batches before sending new queue data

Backend contract

- Outbound payloads follow [`docs/05_payload_schema.md`](./docs/05_payload_schema.md)
- Payloads are validated before send, so schema/contract violations fail fast in-agent
- Retry is only applied to retryable network or HTTP status failures
- Non-retryable delivery failures are dropped instead of looping forever in the queue

Internal observability

- If `features.localHealthEndpoint=true`, the agent exposes:
- `GET /healthz`
- `GET /stats`
- Current default listen address is `127.0.0.1:9101` from `observability.healthAddress`
- Status can be `healthy`, `degraded`, or `unhealthy`
- `/stats` includes queue length, buffered batch count, retry state, and recent send/scrape counters
- `/stats` also exposes the latest send, fail, replay, buffered, and dropped batch ids

Files created follow the package layout defined in `docs/09_package_structure.md`.

Shared configs live in `configs/`.
They are designed to work across multiple nodes by resolving identity in this order:

1. environment override
2. explicit config value
3. auto-derive from hostname
