# CONTRACTS.md

## Purpose

`CONTRACTS.md` defines transport and message contract standards for this repository.

It formalizes the contract rules referenced in `ENGINEER.md` for:

- `REST`
- `gRPC`
- `Kafka`

This file is implementation-facing. It does not redefine service boundaries, system architecture, or data ownership from `docs/*`.

## Governance and Precedence

Use the following precedence model:

1. `docs/*` is the source of truth for product intent, logical architecture, and service boundaries.
2. `AGENTS.md` defines contributor and agent operating behavior.
3. `ENGINEER.md` defines implementation and delivery rules.
4. `CONTRACTS.md` defines contract shape, transport metadata, and compatibility policy.

If a contract decision would violate the architecture documented in `docs/*`, the architecture must be updated intentionally in the same change or the contract must be revised.

## Scope

This file covers:

- request and response contracts for `REST`
- request and response contracts for `gRPC`
- event envelope contracts for `Kafka`
- naming rules
- metadata rules
- versioning rules
- compatibility rules
- example payloads

This file does not cover:

- AI inference output schemas
- storage schemas
- protobuf repository layout
- JSON Schema or OpenAPI generation details

## Shared Contract Principles

All transports must follow these rules:

- contracts are explicit and version-aware
- breaking changes require versioning or an intentional migration plan
- correlation IDs must propagate across sync and async boundaries
- field names must be stable and descriptive
- unknown or undocumented fields must not be depended on
- transport contracts must not leak internal persistence models

Required metadata concepts across transports:

- `correlationId` for request or workflow tracing
- `producer` or caller identity where relevant
- stable resource or event identifiers
- explicit timestamps for business-relevant events

## Naming Rules

Use these conventions consistently:

- REST paths: kebab-case or resource-oriented path segments, for example `/api/v1/alerts`
- JSON fields: camelCase
- gRPC packages: dot-separated lower case, for example `platform.monitoring.v1`
- gRPC services: PascalCase with `Service` suffix
- gRPC messages: PascalCase
- Kafka topics: dotted lower-case namespaces, for example `telemetry.validated`
- Kafka event types: dotted lower-case past-tense forms, for example `alert.created`

## Correlation and Idempotency

### Correlation IDs

Every externally initiated request should start with a `correlationId`.

Rules:

- if the client provides a valid correlation ID, preserve it
- if the client does not provide one, generate one at the edge
- forward the same correlation ID through `REST`, `gRPC`, and `Kafka`
- include the correlation ID in logs and tracing spans

Recommended HTTP header:

- `X-Correlation-Id`

Recommended gRPC metadata key:

- `x-correlation-id`

Recommended Kafka event field:

- `correlationId`

### Idempotency

Idempotency-sensitive operations should use one of:

- explicit idempotency keys at request level
- stable command identifiers
- stable Kafka event keys

Rules:

- create and mutation endpoints that may be retried must document idempotency behavior
- Kafka consumers must process repeated delivery safely where the flow is at-least-once

## REST Contracts

### Role

Use `REST` for:

- browser-facing APIs
- WebAR client APIs
- telemetry ingest APIs
- simple synchronous service APIs when `gRPC` is not justified

### Request Rules

REST requests must define:

- method
- path
- request body shape when applicable
- path and query parameters
- validation rules
- authentication and authorization requirements

Rules:

- request DTOs must be explicit
- nullable and optional fields must be documented clearly
- pagination shape must be standardized per service family
- filtering and sorting semantics must be explicit where supported

### Success Envelope

Preferred success envelope:

```json
{
  "data": {},
  "meta": {
    "correlationId": "req-123",
    "version": "v1"
  }
}
```

Rules:

- envelope is preferred for externally consumed APIs
- raw resource responses are allowed only when standardized consistently within a service
- if raw responses are used, correlation ID must still be returned in headers

### Error Envelope

Canonical error envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": {},
    "correlationId": "req-123"
  }
}
```

Rules:

- `code` is machine-readable and stable
- `message` is human-readable
- `details` is reserved for structured diagnostics
- `correlationId` must be present

### Versioning

REST breaking changes must use one of:

- path versioning, for example `/api/v1/...`
- explicit parallel contract introduction at endpoint level

Rules:

- additive fields are allowed in the same major version
- field removals, type changes, and semantic changes require a new version or compatibility window
- deprecation windows must be documented before removal

### REST Example

Canonical public example for WebAR diagnostics bundle retrieval:

`GET /api/v1/ar/diagnostics/markers/{markerCode}`

Example success response:

```json
{
  "data": {
    "target": {
      "targetType": "node",
      "targetId": "node-01"
    },
    "assetContext": {
      "rackId": "rack-a1",
      "nodeName": "compute-01"
    },
    "snapshot": {
      "status": "warning",
      "cpuUsagePct": 87.2,
      "memoryUsagePct": 74.5
    },
    "alerts": [
      {
        "alertId": "alert-456",
        "severity": "high",
        "state": "open"
      }
    ],
    "ticketContext": {
      "ticketId": "ticket-120",
      "status": "IN_PROGRESS"
    }
  },
  "meta": {
    "correlationId": "req-123",
    "version": "v1"
  }
}
```

## gRPC Contracts

### Role

Use `gRPC` for:

- internal low-latency service-to-service lookup
- typed synchronous composition in the control plane
- internal command-style calls where request-response is required

### Package and Service Rules

Use this pattern:

- package: `<platform>.<boundedcontext>.v<major>`
- service: `<BoundedContext><Capability>Service`
- message: `<Verb><Resource>Request` and `<Verb><Resource>Response`

Example:

- package: `platform.assetcontext.v1`
- service: `AssetLookupService`
- request: `ResolveMarkerRequest`
- response: `ResolveMarkerResponse`

### Field Rules

Rules:

- protobuf field names should be `snake_case`
- message names should be PascalCase
- new fields must be additive and optional where backward compatibility matters
- field numbers must never be reused
- deprecated fields should be marked and retired only after a compatibility window

### Error Mapping

Domain and application errors must map to gRPC status codes consistently.

Recommended mapping:

- validation failure -> `INVALID_ARGUMENT`
- missing resource -> `NOT_FOUND`
- authentication failure -> `UNAUTHENTICATED`
- authorization failure -> `PERMISSION_DENIED`
- conflict or duplicate command -> `ALREADY_EXISTS` or `FAILED_PRECONDITION`
- downstream timeout -> `DEADLINE_EXCEEDED`
- unexpected internal fault -> `INTERNAL`

### Metadata Rules

Required metadata:

- `x-correlation-id`
- caller identity where applicable
- request deadline where relevant

Rules:

- correlation ID must propagate from inbound request to downstream gRPC calls
- services must respect deadlines and return deterministic timeout errors

### Compatibility Rules

Allowed in the same major version:

- adding new optional fields
- adding new RPC methods
- extending response messages with additive fields

Not allowed without a new version or explicit migration path:

- removing fields
- changing field meaning
- changing field type incompatibly
- changing required semantic behavior under the same contract

### gRPC Example

Canonical internal example for marker resolution:

```proto
syntax = "proto3";

package platform.assetcontext.v1;

service AssetLookupService {
  rpc ResolveMarker(ResolveMarkerRequest) returns (ResolveMarkerResponse);
}

message ResolveMarkerRequest {
  string marker_code = 1;
}

message ResolveMarkerResponse {
  string marker_code = 1;
  string target_type = 2;
  string target_id = 3;
  string asset_name = 4;
  bool found = 5;
}
```

## Kafka Contracts

### Role

Use `Kafka` for:

- telemetry propagation
- snapshot update propagation
- alert candidate and alert lifecycle events
- AI completion events
- inspection and simulation events

`Kafka` is an integration backbone, not a source of truth for business entities.

### Topic Rules

Topic names must:

- be dotted lower-case namespaces
- represent a stable domain stream
- avoid transport-specific implementation details in the topic name

Examples:

- `telemetry.raw`
- `telemetry.validated`
- `snapshot.updated`
- `alert.created`
- `ai.inference.completed`

### Canonical Event Envelope

All domain and integration events should follow this envelope:

```json
{
  "eventId": "evt-123",
  "eventType": "telemetry.validated",
  "eventVersion": 1,
  "occurredAt": "2026-06-01T10:00:00Z",
  "producer": "telemetry-ingestion-service",
  "correlationId": "req-123",
  "key": "node-01",
  "payload": {}
}
```

### Event Field Rules

- `eventId` must be globally unique within the producer scope
- `eventType` must be stable and human-readable
- `eventVersion` must be explicit
- `occurredAt` must represent event-time, not processing-time, when event-time matters
- `producer` identifies the producing service
- `correlationId` links the event to upstream workflow or request context
- `key` must match the partitioning and idempotency strategy
- `payload` contains the business data only

### Keying and Partitioning

Rules:

- use stable business keys for ordered flows, for example `alertId`, `nodeId`, or `ticketId`
- keep partition key choice stable over time unless a migration is planned
- choose keys so ordering-sensitive consumers receive a coherent event stream

Examples:

- telemetry by `nodeId`
- alert lifecycle by `alertId`
- ticket workflow by `ticketId`

### Compatibility Rules

Allowed in the same event major version:

- additive payload fields
- additive metadata fields that consumers can safely ignore

Not allowed without a new version:

- removing payload fields used by consumers
- changing field meaning
- changing data types incompatibly
- changing event semantics under the same `eventType` and `eventVersion`

Producer responsibilities:

- publish explicit versioned envelopes
- document new fields
- preserve old versions during migration windows where required

Consumer responsibilities:

- ignore unknown additive fields safely
- not rely on undocumented fields
- treat duplicate delivery as possible

### Kafka Example

Canonical event example for validated telemetry:

```json
{
  "eventId": "evt-telemetry-001",
  "eventType": "telemetry.validated",
  "eventVersion": 1,
  "occurredAt": "2026-06-01T10:00:00Z",
  "producer": "telemetry-ingestion-service",
  "correlationId": "req-123",
  "key": "node-01",
  "payload": {
    "collectorId": "collector-a",
    "batchId": "batch-789",
    "nodeId": "node-01",
    "metrics": [
      {
        "metricKey": "node.cpu_usage_pct",
        "value": 87.2,
        "unit": "percent",
        "timestamp": "2026-06-01T09:59:58Z"
      }
    ]
  }
}
```

## Compatibility Policy Summary

Use these defaults unless a transport-specific exception is documented:

- additive change is preferred
- removal requires a deprecation path
- semantic changes require a new version
- event and API consumers must tolerate additive unknown fields
- schema evolution must be intentional, documented, and test-covered

## Contract Review Checklist

Before introducing or changing a contract, confirm:

1. the contract matches the service boundary documented in `docs/*`
2. the transport choice matches `docs/service_interaction_matrix.md`
3. the request, response, or event envelope is explicit
4. the versioning strategy is documented
5. the correlation ID behavior is preserved
6. compatibility impact is understood and testable

## Cross-References

Use these companion documents together:

- `AGENTS.md`
- `ENGINEER.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/service_decomposition.md`

If contract changes imply architectural changes, update the relevant `docs/*` files in the same change.
