# Telemetry Debug Backend

Small local backend to verify the Go collector agent end to end.

Default address

- `127.0.0.1:8090`
- `127.0.0.1:8091` for gRPC ingest

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

gRPC ingest

- unary method: `telemetry.v1.TelemetryIngestService/IngestBatch`
- default Redpanda topic: `telemetry.grpc.raw`
- default brokers: `localhost:19092`
- the gRPC worker does not parse telemetry business payload; it forwards `payloadBytes` inside a binary transport envelope to Redpanda

`/api/telemetry/batches` returns full metric records now, and with the new collector schema it also surfaces shared `context.identity` and `context.hardwareFingerprint` when present.

Example fail mode request

```json
{
  "statusCode": 503,
  "message": "temporary outage",
  "remaining": 2
}
```

This lets you force the next 2 ingest requests to fail so the agent retry and buffer behavior can be observed.
