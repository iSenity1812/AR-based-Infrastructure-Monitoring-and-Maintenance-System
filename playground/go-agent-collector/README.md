# Go Agent Collector

This folder contains the Go-based collector agent for node telemetry.

## Local development setup

1. Install Go 1.20+.
2. Open a terminal in this folder.
3. Review `configs/agent.yaml` and `.env` if you want local overrides.
4. Run:

```bash
go test ./...
go run ./cmd/agent
```

Useful commands:

```bash
go build ./...
GO_AGENT_RUN_DURATION=15s go run ./cmd/agent
```

## Portable runtime bundle

- The agent now materializes its default `configs/` and `data/` bundle on first run.
- When running a built `collector.exe`, the runtime bundle is created next to the executable.
- During local development, if the current working directory already contains `configs/agent.yaml`, the agent keeps using that directory.
- Override the detected base directory with `GO_AGENT_BASE_DIR=/path/to/runtime`.

This means the collector no longer depends on source files inside `backend/apps/ingestion-worker` at runtime.

## Build a release folder

Run this from `playground/go-agent-collector`:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-collector.ps1
```

To rebuild faster without rerunning tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-collector.ps1 -SkipTests
```

The script creates `dist/collector` with:

- `collector.exe`
- `configs/*.yaml`
- `data/registration/ca.crt`
- `data/registration/ingestion-worker-config.yaml`
- `data/buffer/`
- `README.md`
- `.env.example`

## Deploy to another Windows machine

1. Copy the whole `dist/collector` folder to the target machine.
2. Rename `.env.example` to `.env` if you want to manage runtime settings from a file.
3. Update the minimum required registration settings:
   - `GO_AGENT_BOOTSTRAP_TOKEN`
   - `GO_AGENT_REGISTRATION_ENDPOINT`
   - `GO_AGENT_REGISTRATION_SERVER_NAME`
4. If your CA is different from the bundled one, either:
   - replace `data/registration/ca.crt`, or
   - set `GO_AGENT_REGISTRATION_CA_CERT_PATH`, or
   - set `GO_AGENT_REGISTRATION_CA_CERT_PEM`
5. Review `configs/agent.yaml` if you need to change scrape interval, send mode, endpoints, or observability settings.
6. Start the collector by running:

```powershell
.\collector.exe
```

After the first successful registration, the collector will keep its registration state and provisioned client credentials under `data/registration/`.

## Recommended first-run checklist

1. Confirm the target machine can reach the registration gRPC endpoint.
2. Confirm the TLS server name matches the certificate presented by the server.
3. Confirm the bootstrap token is valid.
4. Run `collector.exe` once and check that `data/registration/registration-state.json` is created.
5. If `features.localHealthEndpoint=true`, verify `http://127.0.0.1:9101/healthz` and `http://127.0.0.1:9101/stats`.

## Useful deployment environment variables

Registration:

- `GO_AGENT_BASE_DIR`: move runtime files outside the collector folder.
- `GO_AGENT_BOOTSTRAP_TOKEN`: registration bootstrap token without editing YAML.
- `GO_AGENT_REGISTRATION_ENDPOINT`: gRPC registration endpoint, for example `10.0.0.25:8443`.
- `GO_AGENT_REGISTRATION_SERVER_NAME`: TLS server name used for registration and send.
- `GO_AGENT_REGISTRATION_CA_CERT_PATH`: use an external CA cert path instead of the bundled one.
- `GO_AGENT_REGISTRATION_CA_CERT_PEM`: write CA cert contents directly into `data/registration/ca.crt` on startup.
- `GO_AGENT_REGISTRATION_CLIENT_CERT_PATH`: externally managed client certificate path.
- `GO_AGENT_REGISTRATION_CLIENT_KEY_PATH`: externally managed client private key path.
- `GO_AGENT_REGISTRATION_STATE_PATH`: custom registration state path.
- `GO_AGENT_REGISTRATION_SHARED_CONFIG_PATH`: custom ingestion worker shared config path.

Identity overrides:

- `GO_AGENT_ID`
- `GO_AGENT_NAME`
- `GO_NODE_ID`
- `GO_NODE_NAME`
- `GO_PRIMARY_NIC`
- `GO_AGENT_DEVICE_TYPE`

HTTP delivery:

- `GO_AGENT_API_TOKEN`: auth token for HTTP delivery mode.

## Runtime behavior

1. Scrape local exporter metrics on `scrape.interval` (`15s` in `configs/agent.yaml`).
2. Parse and normalize metrics into `node.*`.
3. Queue normalized metrics in memory.
4. Build batch payloads and send them on `send.interval` (`15s` in `configs/agent.yaml`).
5. Send payloads to backend over HTTP or gRPC.
6. Persist retryable failed batches to `data/buffer`.
7. Replay buffered batches before sending new queue data.

## gRPC delivery notes

- Set `send.transport=grpc` to enable unary gRPC delivery.
- Keep `send.timeout` for REST behavior.
- Use `send.grpcTimeout` for gRPC calls, default `15s`.
- For gRPC, `send.endpoint` should be `host:port`, for example `127.0.0.1:8091`.

## Quick E2E test

1. Start Redpanda locally.
2. Run the telemetry debug backend on `127.0.0.1:8090` for HTTP and `127.0.0.1:8091` for gRPC.
3. Set the agent to `send.transport: grpc` and point `send.endpoint` to the backend gRPC address.
4. Run the agent with `GO_AGENT_RUN_DURATION=35s go run ./cmd/agent` so it has time for at least two 15s cycles.
5. Check `GET /api/telemetry/stats` on `http://127.0.0.1:8090` and confirm `receivedBatchCount` increases.
6. Optional: read `telemetry.grpc.raw` with `rpk topic consume` to verify the binary envelope landed in Redpanda.

## Backend contract

- Outbound payloads follow [`docs/05_payload_schema.md`](./docs/05_payload_schema.md).
- Payloads are validated before send, so schema or contract violations fail fast in-agent.
- Retry is only applied to retryable network or HTTP status failures.
- Non-retryable delivery failures are dropped instead of looping forever in the queue.

## Internal observability

- If `features.localHealthEndpoint=true`, the agent exposes:
- `GET /healthz`
- `GET /stats`
- Current default listen address is `127.0.0.1:9101` from `observability.healthAddress`.
- Status can be `healthy`, `degraded`, or `unhealthy`.
- `/stats` includes queue length, buffered batch count, retry state, and recent send or scrape counters.
- `/stats` also exposes the latest send, fail, replay, buffered, and dropped batch ids.

Files created follow the package layout defined in `docs/09_package_structure.md`.

Shared configs live in `configs/`.
They are designed to work across multiple nodes by resolving identity in this order:

1. environment override
2. explicit config value
3. auto-derive from hostname
