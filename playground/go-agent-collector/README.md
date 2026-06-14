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

1. Scrape local exporter metrics on `scrape.interval` (`15s` in `configs/agent.yaml`)
2. Parse and normalize metrics into `node.*`
3. Queue normalized metrics in memory
4. Build batch payloads and send them on `send.interval` (`15s` in `configs/agent.yaml`)
5. Send payloads to backend over HTTP or gRPC
6. Persist retryable failed batches to `data/buffer`
7. Replay buffered batches before sending new queue data

gRPC delivery notes

- Set `send.transport=grpc` to enable unary gRPC delivery
- Keep `send.timeout` for REST behavior
- Use `send.grpcTimeout` for gRPC calls, default `15s`
- For gRPC, `send.endpoint` should be `host:port`, for example `127.0.0.1:8091`

Quick E2E test

1. Start Redpanda locally.
2. Run the telemetry debug backend on `127.0.0.1:8090` for HTTP and `127.0.0.1:8091` for gRPC.
3. Set the agent to `send.transport: grpc` and point `send.endpoint` to the backend gRPC address.
4. Run the agent with `GO_AGENT_RUN_DURATION=35s go run ./cmd/agent` so it has time for at least two 15s cycles.
5. Check `GET /api/telemetry/stats` on `http://127.0.0.1:8090` and confirm `receivedBatchCount` increases.
6. Optional: read `telemetry.grpc.raw` with `rpk topic consume` to verify the binary envelope landed in Redpanda.

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
