# OPS.md

## Purpose

`OPS.md` defines the runtime and operations handbook for this platform.

It translates the documented architecture into operational guidance for:

- deployment
- infrastructure layout
- monitoring
- observability
- scaling
- rollback and recovery

This file is runtime-facing. It does not redefine the logical architecture from `docs/*`.

## Governance and Precedence

Use the following precedence model:

1. `docs/*` is the source of truth for logical architecture, service boundaries, and data ownership.
2. `AGENTS.md` defines contributor and agent behavior.
3. `ENGINEER.md` defines implementation and delivery conventions.
4. `OPS.md` defines runtime, deployment, and operational standards.

Runtime choices in this file must not be interpreted as changes to logical ownership or service boundaries.

## Operating Model

This repository standardizes a lean operational baseline for:

- `cheap VPS`
- `GCP VM`

The runtime model is the same in both environments:

- `Docker` for image packaging
- `k3s` on virtual machines
- `Traefik` as the baseline ingress
- `NGINX Ingress` as an allowed alternative, but not the default
- `Vertex AI` remains external to the cluster

This file targets:

- PoC
- early production
- production-lite operational discipline

It does not target a full HA enterprise cluster by default.

## Runtime Goals and Assumptions

Baseline goals:

- keep infrastructure simple enough to operate with a small team
- preserve clear separation between control plane and data plane
- keep observability first-class from day one
- prefer reversible deployment and rollback workflows
- avoid introducing managed platform complexity unless it buys clear operational value

Baseline assumptions:

- services are containerized
- runtime orchestration is `k3s`
- ingress terminates at cluster edge
- data services may start as self-managed or externally hosted depending budget
- `Vertex AI` is not in the online hot path for monitoring requests

## Deployment Profiles

### Cheap VPS Profile

Use this profile for:

- demo environments
- thesis or lab deployment
- early team validation
- constrained budget

Recommended baseline:

- single VPS
- single-node `k3s`
- `Traefik` as ingress
- all app services containerized in-cluster
- persistent storage for `MongoDB`, `TimescaleDB`, and `Redis`
- `Kafka` kept small and carefully sized

Suggested placement:

- control-plane services run in-cluster
- data-plane services run in-cluster
- observability stack may run in-cluster with resource limits
- optional object storage can be deferred or externalized

Operational tradeoff:

- lowest cost
- simplest setup
- weakest failure isolation

### GCP VM Profile

Use this profile for:

- stronger operational isolation
- better growth headroom
- more predictable scaling and persistence

Recommended baseline:

- `k3s` on GCP VMs
- `1-3 nodes` depending maturity and budget
- `Traefik` as ingress baseline
- optional separation between application nodes and data service nodes

Suggested progression:

- start with single-node `k3s` on one VM for parity with VPS
- move to small multi-node `k3s` when workload or reliability needs increase

Operational tradeoff:

- more flexibility and separation than cheap VPS
- still simpler than a fully managed Kubernetes design
- requires explicit VM, disk, and network management

## Runtime Topology

### Logical Runtime Layers

Treat the runtime as these layers:

- edge and ingress
- control-plane services
- data-plane services
- platform data services
- observability stack
- external managed dependencies

### Baseline Placement

`Traefik` owns:

- inbound HTTP and HTTPS routing
- TLS termination where configured
- routing to public APIs

Control-plane services own:

- public APIs
- workflow orchestration
- diagnostics bundle composition

Data-plane services own:

- telemetry ingest
- stream processing
- AI analytics execution inside platform runtime

Platform data services own:

- `Kafka`
- `MongoDB`
- `TimescaleDB`
- `Redis`

External managed dependencies:

- `Vertex AI`

## Infrastructure Components

Standard baseline components:

- `k3s`
- `Traefik`
- `Kafka`
- `MongoDB`
- `TimescaleDB`
- `Redis`
- optional object storage when attachments, replay artifacts, or payload archives become operationally necessary
- `OpenTelemetry`
- `Jaeger`
- `Prometheus`
- `Grafana`

### Ownership Expectations

`k3s` owns:

- scheduling
- service networking
- workload lifecycle

`Traefik` owns:

- ingress routing
- public entrypoint exposure

`Kafka` owns:

- async event transport
- replay-capable event flow

`MongoDB` owns:

- operational business truth by service boundary

`TimescaleDB` owns:

- raw telemetry
- telemetry rollups and time-series history

`Redis` owns:

- derived state
- hot cache
- short-lived coordination data where explicitly justified

## Monitoring and Observability

### Stack

This platform standardizes:

- `OpenTelemetry` for instrumentation and collection
- `Jaeger` for distributed tracing
- `Prometheus` for metrics
- `Grafana` for dashboards and operational visibility

### Responsibilities

`OpenTelemetry` handles:

- trace generation
- context propagation
- instrumentation hooks for HTTP, gRPC, Kafka, and workers

`Jaeger` handles:

- trace storage and exploration
- end-to-end workflow tracing

`Prometheus` handles:

- scrape-based metrics collection
- service, runtime, and infrastructure metrics

`Grafana` handles:

- service dashboards
- platform dashboards
- operational alert visibility

### Required Signal Categories

Application signals:

- request latency
- request rate
- error rate
- service health
- readiness status
- dependency call latency
- diagnostics bundle latency

Data-plane signals:

- telemetry ingest rate
- invalid payload rate
- Kafka producer failure rate
- consumer lag
- stream processing latency
- snapshot materialization lag

Platform signals:

- CPU
- memory
- disk
- pod restarts
- container restart loops
- ingress health
- database connectivity

Data service signals:

- Kafka broker health
- topic throughput
- partition skew
- consumer lag
- MongoDB health
- TimescaleDB health
- Redis availability

### Correlation and Trace Propagation

Every operationally important flow should propagate:

- `correlationId`
- trace context

Propagation must cover:

- `REST`
- `gRPC`
- `Kafka`

This is mandatory for:

- telemetry ingest flows
- alert creation flows
- incident and inspection flows
- WebAR diagnostics reads

### Logs

This documentation pass does not lock a separate log backend.

Logging expectations:

- structured logs only
- correlation ID in log context
- no secrets in logs
- logs should be forwardable to a centralized backend later without schema rewrite

## Scaling Approach

### General Policy

Scale stateless services horizontally first.

Examples:

- `Control Plane API and BFF`
- `Identity Service`
- `Monitoring Service`
- `Notification Service`

Stateful or throughput-sensitive services require more caution:

- `Kafka`
- `MongoDB`
- `TimescaleDB`
- `Redis`
- `Stream Processing Service`

### Control Plane Scaling

Scale based on:

- request rate
- latency
- CPU saturation
- memory pressure

Preferred approach:

- add replicas for stateless API services
- keep ingress routing simple
- ensure session and cache assumptions remain safe under multi-replica operation

### Data Plane Scaling

Scale based on:

- ingest rate
- consumer lag
- batch processing latency
- snapshot backlog

Preferred approach:

- scale ingestion horizontally if it remains stateless
- scale Kafka consumers in line with topic partitions
- scale stream processing based on lag and workload window size

Rules:

- do not scale Kafka consumers beyond useful partition parallelism
- preserve ordering-sensitive flows through stable keys
- verify downstream stores can absorb the increased write rate

### Database Scaling

Database scaling is a separate operational concern.

Rules:

- treat `MongoDB`, `TimescaleDB`, and `Redis` scaling independently from app-service scaling
- prefer vertical scaling first in lean environments
- move to topology changes only when workload justifies the added operational cost

## Rollback and Recovery

### Deployment Rollback

Primary rollback strategy:

- image-tag based rollback

Rules:

- every deployable service image must be tagged with commit SHA
- releases may add semantic tags, but SHA tags are the rollback anchor
- rollback must be executable without rebuilding artifacts

### Config Rollback

Configuration rollback is separate from application rollback.

Rules:

- treat app image changes and config changes as separately traceable changes
- keep environment config versioned
- avoid bundling unrelated config and app changes in the same release step when possible

### Data Compatibility Rules

Before rollout:

- DB schema changes must be backward-compatible with the previous application version
- Kafka event changes must be version-safe for mixed producer and consumer windows
- destructive schema changes require a staged migration plan

### Rollback Checklists

Control-plane rollback should verify:

- ingress routes are healthy
- APIs return expected status
- auth and diagnostics paths work
- notification side effects are acceptable after rollback

Data-plane rollback should verify:

- ingestion still accepts payloads
- consumer lag is stable
- snapshot updates continue
- alert candidate generation resumes correctly

### Recovery Priorities

When recovering from operational failure, prioritize in this order:

1. ingress and public API availability
2. telemetry ingest continuity
3. Kafka health and consumer recovery
4. operational databases
5. observability visibility

## Operational Guardrails

Use these guardrails by default:

- do not let runtime topology imply new logical ownership
- do not put `Vertex AI` in the online request hot path
- do not treat Kafka as persistence for workflow truth
- do not scale consumers blindly without checking partitioning and lag
- do not deploy incompatible event or DB changes without staged rollout
- do not run without baseline tracing and metrics

## Anti-Patterns

Avoid these operational patterns:

- single opaque VM process with no container boundaries
- mixing control-plane and data-plane scaling rules as if they are identical
- using rollout changes that cannot be reversed by image or config version
- skipping observability for workers and async flows
- over-provisioning the cluster for a PoC while under-instrumenting it
- making `cheap VPS` and `GCP VM` diverge into two different architectural models

## Operational Review Checklist

Before approving a deployment or runtime change, confirm:

1. the runtime change does not alter documented logical ownership
2. observability coverage exists for the affected path
3. rollback is possible by image tag and config revision
4. DB and event compatibility have been reviewed
5. scaling assumptions match the workload profile
6. the runtime profile still fits either `cheap VPS` or `GCP VM` lean baseline

## Cross-References

Use these companion documents together:

- `AGENTS.md`
- `ENGINEER.md`
- `CONTRACTS.md`
- `docs/overview_architecture.md`
- `docs/data_pipeline_architecture.md`
- `docs/data_architecture.md`

If runtime changes imply architecture changes, update the relevant `docs/*` files in the same change.
