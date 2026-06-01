# AGENTS.md

## Purpose and Role

This repository defines the architecture and system context for an AR-assisted infrastructure monitoring and maintenance platform in a simulated data center environment.

Agents working in this repository must treat the workspace as an architecture-first, documentation-driven project. The primary responsibility is to preserve consistency between architectural intent, system boundaries, and any future implementation artifacts.

## Documentation Precedence

`docs/*` is the source of truth for:

- product intent
- architecture boundaries
- service decomposition
- interaction patterns
- data ownership
- system workflows
- terminology and platform decisions

`AGENTS.md` is the source of truth for:

- how contributors and AI agents should operate in this repository
- architecture guardrails
- anti-patterns to avoid
- expectations for consistency across docs and code

Root companion docs provide narrower guidance:

- `ENGINEER.md` defines implementation conventions and delivery rules
- `CONTRACTS.md` defines REST, gRPC, and Kafka contract standards
- `FRONTEND.md` defines frontend architecture and WebAR implementation standards
- `OPS.md` defines deployment and runtime operations standards

If code or new documentation diverges from the established architecture, the change must either:

- realign with the current docs, or
- intentionally update the relevant docs in the same change

Do not silently introduce new architectural assumptions.

## System Context and Overview

The system is a proof-of-concept platform for:

- centralized infrastructure monitoring
- contextual maintenance with WebAR
- alert, incident, and ticket workflows
- AI-assisted anomaly and risk enrichment
- simulated data center operations

The current strategic architecture decisions are:

- `NestJS` for the control plane
- Python services for the data plane
- `Kafka` as the core event backbone
- `TimescaleDB` for telemetry and time-series history
- `MongoDB` segmented by service boundary for operational data
- `Redis` for derived serving state and hot cache
- `Vertex AI` for training, experiment tracking, and model lifecycle only
- `WebAR + QR marker-based interaction` as the canonical field interface

The AR client is browser-based. Do not assume a native mobile AR stack unless a future source-of-truth doc explicitly changes that decision.

## Architecture Rules

- Design by bounded context, not by controller or screen.
- Do not create a microservice whose only responsibility is query aggregation.
- Keep composition logic in the `Control Plane API and BFF`.
- Preserve the separation between `control plane` and `data plane`.
- Treat `AI` as an enrichment capability, not the owner of operational workflow state.
- Treat `AR diagnostics` as a query use case, not a source-of-truth domain.
- Keep deployment/runtime concerns separate from logical architecture concerns.
- Do not mix `Docker` / `k3s` runtime concerns into service ownership or data ownership diagrams.

## Service Boundaries

Current target microservice boundaries are:

- `Control Plane API and BFF`
- `Identity Service`
- `Asset Context Service`
- `Monitoring Service`
- `Incident Workflow Service`
- `Simulation Service`
- `Notification Service`
- `Audit Service`
- `Telemetry Ingestion Service`
- `Stream Processing Service`
- `AI Analytics Service`

Interpretation rules:

- `Control Plane API and BFF` is a public entrypoint and composition layer. It does not own authoritative business data.
- `Asset Context Service` owns topology and marker mapping together.
- `Monitoring Service` owns alert rules, alerts, and monitoring read models.
- `Incident Workflow Service` owns incidents, tickets, comments, inspection workflow, and AR sessions/inspections.
- `Telemetry Ingestion Service` owns the ingest contract and raw telemetry write path.
- `Stream Processing Service` owns derived snapshots, aggregates, and alert candidates as derived data.
- `AI Analytics Service` owns inference records and external model lifecycle integration, but not alert lifecycle.

## Data Ownership Rules

Use `database-per-service` as the architecture principle.

Guidelines:

- A microservice must not directly query authoritative collections or tables owned by another service.
- Cross-service data access must happen through:
  - `REST` or `gRPC` for synchronous access
  - `Kafka` for asynchronous propagation
  - replicated read models when explicitly justified
- `MongoDB` may be a shared physical cluster, but ownership must still be segmented by logical database or strict schema boundary.
- `TimescaleDB` is authoritative for telemetry, but table or schema ownership must still be separated between ingest and stream-processing responsibilities.
- `Redis` stores derived state only.
- `Kafka` is an event backbone, not a source of truth for business entities.
- `Vertex AI` is external to the platform runtime and not in the online monitoring hot path.

## Data Flow Overview

Canonical high-level flow:

1. `Telemetry Collectors` and `Simulation Producers` send batched data to `Telemetry Ingestion Service`.
2. `Telemetry Ingestion Service` authenticates, validates, persists raw telemetry, and publishes canonical events to `Kafka`.
3. `Stream Processing Service` consumes telemetry events, performs enrichment, builds snapshots, generates aggregates, and emits alert candidates.
4. `AI Analytics Service` consumes telemetry or derived windows, produces anomaly and risk enrichment, and stores inference results.
5. `Monitoring Service` owns alert lifecycle and monitoring-facing read models.
6. `Incident Workflow Service` owns operational workflow after alert triage.
7. `Control Plane API and BFF` composes reads for `Web Dashboard` and `WebAR Client`.

The `WebAR Client` must not read raw telemetry directly.

## Decision Logic

When introducing or evaluating a change, apply these checks:

1. Does the change preserve the documented bounded context?
2. Does the change preserve `database-per-service`?
3. Does the change keep `WebAR + QR` as the default AR delivery model?
4. Does the change avoid pushing composition logic into a separate microservice without owned data?
5. Does the change avoid making `AI` or `Kafka` the owner of workflow truth?
6. Does the change keep `docs/*` and architecture terminology aligned?

If the answer to any of the above is no, update the design consciously and document the reason.

## Anti-Patterns

Do not introduce these without an explicit documented architecture change:

- a native mobile AR app as the default client
- `ArUco-first` wording as the canonical v1 field interaction path
- direct database reads across microservice ownership boundaries
- a BFF that starts owning business truth
- a query-only microservice that exists only to gather data from other services
- storing raw telemetry in MongoDB as the main telemetry history store
- moving online inference hot-path requests to `Vertex AI`
- using `Kafka` as a replacement for workflow persistence

## File Structure Guidance

Use these docs as the primary architecture map:

- `docs/service_decomposition.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/data_architecture.md`
- `docs/overview_architecture.md`
- `docs/system_requirements_v1_vn.md`
- `docs/topic_proposal_vn.md`
- `docs/topic_proposal.md`

Use telemetry-specific docs to understand collector and metric semantics:

- `docs/telemetry/*`
- `playground/go-agent-collector/docs/*`
- `playground/telemetry/*`

When editing or generating new docs:

- preserve terminology consistency across VN and EN files
- prefer updating existing source-of-truth docs over adding overlapping parallel docs
- keep architecture docs abstract enough for design communication, but precise enough to derive detailed design

## Expected Contributor Behavior

- Read relevant docs before making architectural changes.
- Prefer consistency over inventing a new local pattern.
- When a change affects architecture, update all directly impacted source-of-truth docs in the same change.
- Keep wording aligned: `WebAR Client`, `QR marker-based spatial anchoring`, `marker resolution through control plane`, `database-per-service`, `control plane`, `data plane`.
