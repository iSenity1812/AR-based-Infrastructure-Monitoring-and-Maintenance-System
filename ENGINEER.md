# ENGINEER.md

## Purpose

`ENGINEER.md` defines implementation standards for this repository.

It exists to translate the architecture documented in `docs/*` into executable engineering rules for:

- code organization
- service structure
- testing
- CI/CD
- commit and pull request discipline
- API and event contracts

This file does not redefine product scope or system architecture.

## Governance and Precedence

Use the following precedence model:

1. `docs/*` is the source of truth for product intent, system architecture, service boundaries, data ownership, and terminology.
2. `AGENTS.md` is the source of truth for contributor and AI-agent operating behavior.
3. `ENGINEER.md` is the source of truth for implementation conventions and delivery rules.

If implementation guidance in this file appears to conflict with `docs/*`, follow `docs/*` and update this file in the same change.

Do not use `ENGINEER.md` to silently override architecture decisions already fixed in:

- `docs/service_decomposition.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/data_architecture.md`
- `docs/overview_architecture.md`

## System Baseline

The current target system baseline is:

- `pnpm workspaces` monorepo
- `microservices` aligned to documented bounded contexts
- `NestJS` for the control plane
- `Python` services for the data plane
- `Kafka` as the async event backbone
- `MongoDB` segmented by service boundary for operational data
- `TimescaleDB` for telemetry and time-series history
- `Redis` for derived state and hot cache
- `Docker` for image packaging
- `k3s` for self-managed runtime orchestration
- `Vertex AI` for training, experiment tracking, and model lifecycle only
- `WebAR Client` as the browser-based field interface

This repository does not use `Nx` or `Turbo`.

Monorepo orchestration must come from:

- workspace-level scripts
- per-service scripts
- CI job composition

## Top-Level Repository Structure

Use this repository structure as the default target:

```text
/
|- apps/
|  |- control-plane/
|  |  |- control-plane-api/
|  |  |- identity-service/
|  |  |- asset-context-service/
|  |  |- monitoring-service/
|  |  |- incident-workflow-service/
|  |  |- simulation-service/
|  |  |- notification-service/
|  |  \- audit-service/
|  \- data-plane/
|     |- telemetry-ingestion-service/
|     |- stream-processing-service/
|     \- ai-analytics-service/
|- packages/
|  |- contracts/
|  |- config/
|  |- logging/
|  \- utils/
|- infra/
|  |- docker/
|  |- k8s/
|  \- ci/
|- docs/
|- scripts/
|- tests/
|- AGENTS.md
\- ENGINEER.md
```

Interpretation rules:

- `apps/` contains deployable services only.
- `apps/control-plane/` contains services that implement user-facing workflow, orchestration, and composition.
- `apps/data-plane/` contains services that implement ingestion, streaming/processing, and analytics pipelines.
- `packages/` contains stable cross-cutting libraries only.
- `infra/` contains runtime and deployment assets.
- `docs/` contains product and architecture source-of-truth documentation.
- `scripts/` contains repository automation helpers.
- `tests/` is reserved for cross-service, platform-level, or shared test assets when local service test folders are insufficient.

Do not place bounded-context domain logic in `packages/`.

Allowed shared package categories:

- DTO and contract libraries shared intentionally across services
- logging primitives
- config loading and validation primitives
- common utility functions with no domain ownership
- test helpers that are not coupled to a specific service domain

Not allowed in shared packages:

- service-specific business rules
- aggregate logic
- workflow orchestration logic
- persistence logic that embeds another service's domain assumptions

## Service Boundaries

Implementation must follow the current target service boundaries from `docs/service_decomposition.md`:

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

Boundary rules:

- Each service owns one bounded context.
- Each service owns its own authoritative data boundary.
- Each service exposes behavior through explicit interfaces, not through direct database access by other services.
- `Control Plane API and BFF` is a composition layer and public entrypoint. It does not own authoritative business truth.
- Query composition belongs in the BFF or a context-owning service, not in a standalone query-only microservice.

Implementation note:

- Physical folder grouping (`apps/control-plane/*` vs `apps/data-plane/*`) is an implementation convenience. It must not change the logical service boundaries defined in `docs/*`.

## Database-Per-Service Rule

Use `database-per-service` as a hard architecture rule.

This means:

- a service must not read or mutate another service's authoritative collections or tables directly
- cross-service reads must happen via `REST`, `gRPC`, or replicated read models backed by events
- cross-service writes must happen via public service APIs or async event handling
- a shared physical database cluster is acceptable only when logical ownership remains strict

Authoritative data expectations:

- `MongoDB` stores operational system-of-record data by service boundary
- `TimescaleDB` stores telemetry and time-series history
- `Redis` stores derived serving state only
- `Kafka` is an integration backbone, not a source of truth for business entities

## Monorepo Standards

### Workspace Baseline

Use `pnpm workspaces` as the package and workspace manager baseline.

Expected principles:

- one lockfile at repo root
- one workspace manifest at repo root
- one package manifest per service or shared package
- root scripts orchestrate standard tasks across services
- each deployable service owns its local scripts for build, test, lint, and run

### Root Scripts

The repo should converge on root-level scripts for:

- dependency installation
- formatting checks
- lint checks
- type checks where applicable
- unit test orchestration
- integration test orchestration
- contract test orchestration
- Docker build orchestration

These scripts should delegate to service-local scripts rather than embedding service-specific logic directly at root.

### Service Independence

Each service should be buildable and testable in isolation.

A service should not require booting unrelated services unless the specific test target is:

- cross-service integration
- end-to-end validation
- contract compatibility validation

## Service Internal Structure

Every service should follow a clean architecture layout.

Default service layout:

```text
apps/<service-name>/src/
|- domain/
|- use-cases/
|- adapters/
|- infrastructure/
\- presentation/
```

Alternative:

- `application/` may be used instead of `use-cases/` if the service team prefers that label.
- Do not mix both names in the same service.

### Layer Responsibilities

#### `domain/`

Contains:

- entities
- value objects
- aggregates
- domain services
- domain events
- repository and port interfaces
- pure domain policies

Rules:

- no framework imports
- no transport concerns
- no ORM models
- no HTTP, gRPC, Kafka, or database code

#### `use-cases/` or `application/`

Contains:

- commands
- queries
- use-case orchestration
- transaction boundaries
- DTO mapping between external contracts and domain operations
- authorization coordination when business-level authorization is needed

Rules:

- depends on `domain` abstractions
- depends on ports and interfaces, not concrete implementations
- contains business orchestration, but not framework bootstrapping

#### `adapters/`

Contains:

- database repository adapters
- Kafka publishers and consumers
- external API clients
- cache adapters
- object storage adapters
- mapping logic between external systems and application ports

Rules:

- implements ports defined inward
- does not own business policy
- does not call another service's database directly

#### `infrastructure/`

Contains:

- framework bootstrapping
- dependency injection wiring
- server startup
- configuration loading
- observability setup
- transport registration
- runtime assembly

Rules:

- may depend on concrete adapters and presentation
- should remain thin and compositional

#### `presentation/`

Contains:

- HTTP controllers
- gRPC handlers
- request validation
- serializers
- response mappers
- transport-facing DTOs

Rules:

- thin transport layer only
- no embedded business logic
- no direct database access

### Dependency Rule

Dependencies point inward.

Required direction:

- `presentation` -> `use-cases`
- `infrastructure` -> `presentation`, `adapters`, `use-cases`
- `adapters` -> inward interfaces
- `use-cases` -> `domain`
- `domain` -> nothing framework-specific

Forbidden patterns:

- `domain` importing framework packages
- `use-cases` importing transport packages
- `presentation` implementing business rules
- direct adapter-to-adapter orchestration across services

### Example Service Skeleton

```text
apps/identity-service/
|- package.json
|- tsconfig.json
|- Dockerfile
|- src/
|  |- domain/
|  |  |- entities/
|  |  |- value-objects/
|  |  |- events/
|  |  \- ports/
|  |- use-cases/
|  |  |- commands/
|  |  |- queries/
|  |  \- dto/
|  |- adapters/
|  |  |- persistence/
|  |  |- messaging/
|  |  \- external/
|  |- infrastructure/
|  |  |- config/
|  |  |- di/
|  |  \- bootstrap/
|  \- presentation/
|     |- http/
|     \- grpc/
\- tests/
```

## Coding Standards

### General Standards

All code must follow these rules:

- preserve bounded-context ownership
- preserve `database-per-service`
- use explicit input and output contracts
- use deterministic names and predictable file placement
- prefer constructor injection or explicit dependency injection over service locator patterns
- load configuration from environment through typed config objects
- fail fast on invalid runtime configuration
- keep side effects at the edges of the service
- keep domain logic deterministic and testable

### Naming Standards

Use the following naming conventions:

- service names: kebab-case, for example `identity-service`
- folder names: kebab-case or domain-specific lower case, but consistent per service
- class names: PascalCase
- DTO names: `<Action><Resource>RequestDto`, `<Action><Resource>ResponseDto` or equivalent consistent pattern
- event names: past-tense domain event form, for example `alert.created`
- Kafka topics: dotted lower-case namespace form, for example `telemetry.validated`
- environment variables: upper snake case

### NestJS Standards

For control-plane services using `NestJS`:

- controllers must stay thin
- decorators, modules, and controllers must not contain business logic
- validation must happen at transport boundaries
- serialization must be explicit
- use-case or application services orchestrate business behavior
- persistence must go through repository or port abstractions
- avoid leaking ORM or persistence models into controllers or public contracts

### Python Standards

For data-plane services using `Python`:

- keep framework entrypoints thin
- isolate ingest, processing, and analytics logic from HTTP or worker boot code
- use typed schemas for incoming and outgoing payloads
- make worker state explicit
- avoid hidden mutable global state
- keep data transformation functions deterministic where possible
- separate runtime wiring from pipeline logic

### Error Handling and Observability

Every service must implement:

- structured logs
- correlation or request IDs
- explicit error classes
- transport-level error mapping
- health and readiness endpoints where applicable

Logging rules:

- logs must be machine-parseable
- do not log secrets
- do not rely on free-form string logs for operationally important state
- include identifiers needed for tracing across services and events

## Communication and Contract Rules

### Transport Responsibilities

Use transport types consistently:

- `REST` for client-facing requests and simple synchronous service APIs
- `gRPC` for internal low-latency synchronous service interactions
- `Kafka` for asynchronous domain and integration events
- `Socket` only for realtime client push, not as the backbone between services

### API Contracts

`ENGINEER.md` standardizes `API + Events` only.

API contract rules:

- public and internal APIs must have explicit request and response schemas
- breaking changes require versioning or an intentional compatibility strategy
- responses must include a correlation or request ID through headers or envelope metadata
- error responses must follow one standard structure per transport
- raw resource responses are allowed only when the service standardizes them consistently and documents the exception

Recommended HTTP error envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable message",
    "details": {},
    "correlationId": "req-123"
  }
}
```

Recommended success envelope when an envelope is used:

```json
{
  "data": {},
  "meta": {
    "correlationId": "req-123"
  }
}
```

If a service uses raw resource responses instead of envelopes, it must still preserve:

- explicit error contract
- correlation ID propagation
- stable versioning semantics

### Event Contracts

Kafka events must use explicit versioned envelopes.

Recommended event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "alert.created",
  "eventVersion": 1,
  "occurredAt": "2026-06-01T10:00:00Z",
  "producer": "monitoring-service",
  "correlationId": "req-123",
  "key": "alert-456",
  "payload": {}
}
```

Event rules:

- every event must have a stable event type
- every event must have an explicit version
- every event must define a partitioning key strategy
- idempotency-sensitive flows must use stable keys and consumer-safe processing
- producers own schema evolution responsibility
- consumers must not assume undocumented fields

Do not expand this file into AI model output schemas. AI-specific output contracts belong in dedicated design documents when needed.

## Testing Strategy

Organize tests by scope:

- `unit tests`
- `integration tests`
- `contract tests`
- `end-to-end tests`

### Unit Tests

Required for:

- domain entities
- value objects
- domain services
- use-case orchestration with mocked ports
- pure transformation logic

Rules:

- no database
- no Kafka
- no network
- no framework bootstrapping unless explicitly necessary

### Integration Tests

Required for:

- repository adapters
- persistence mappings
- Kafka publishers and consumers
- cache adapters
- object storage adapters
- framework wiring that crosses process boundaries

Rules:

- test real integration behavior where feasible
- prefer ephemeral dependencies or dedicated test environments
- do not replace all infrastructure with mocks and call that integration coverage

### Contract Tests

Required for:

- public REST APIs
- internal gRPC interfaces
- Kafka message envelopes and keying rules

Rules:

- verify schema shape
- verify required fields
- verify compatibility expectations
- verify expected error behavior

### End-to-End Tests

Required for critical platform flows:

- telemetry ingest path
- alert lifecycle
- incident and ticket workflow
- WebAR diagnostics bundle retrieval

These tests may be fewer in number, but they must cover the highest-risk operational paths.

### Mocking Rules

Allowed:

- external services
- managed platforms such as `Vertex AI`
- third-party APIs

Avoid mocking:

- core domain behavior
- repository contracts when the goal is adapter validation
- event contracts when the goal is consumer or producer compatibility

### Test Data Rules

Use:

- deterministic fixtures
- explicit builders or factories
- explicit seed steps for integration and e2e tests

Avoid:

- hidden shared mutable fixtures
- order-dependent test suites
- opaque global bootstrap state

## CI/CD Rules

### CI Principles

Because this monorepo does not use `Nx` or `Turbo`, CI must be composed explicitly.

Standard CI stages:

1. install dependencies from the workspace lockfile
2. run formatting checks
3. run lint checks
4. run type checks where applicable
5. run unit tests
6. run integration tests for changed services or required service groups
7. run contract tests
8. optionally run e2e smoke tests on protected branches or release paths

Required merge gates:

- formatting passes
- lint passes
- tests pass
- contract changes are versioned or intentionally approved
- no architecture-violating dependency changes are introduced

### CD Principles

Standard CD expectations:

- build one Docker image per deployable service
- tag images with commit SHA
- support additional semantic branch or release tags
- publish build artifacts in a traceable way
- deploy self-managed runtime components to `k3s`
- keep `Vertex AI` outside in-cluster deployment rules

Promotion rules:

- PR validation happens before merge
- merge to main triggers build and publish flow
- environment promotion must be explicit and traceable
- infrastructure and application changes should preserve rollback paths

### Workflow Ownership

CI/CD definitions should live in repository-managed automation under:

- `.github/workflows/` when GitHub Actions is used
- `infra/ci/` for shared templates, scripts, or supporting automation

The repo currently does not commit a complete workflow set. This file defines the target engineering standard for future workflow implementation.

## Commit and Pull Request Rules

### Commit Convention

Use `Conventional Commits`.

Allowed baseline types:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `build`
- `ci`
- `chore`

Use bounded-context scopes where useful:

- `feat(identity-service): add refresh token rotation`
- `fix(stream-processing-service): handle duplicate snapshot event`
- `docs(architecture): update data ownership rules`

Commit rules:

- one logical change per commit
- do not mix unrelated refactors and behavior changes
- architecture doc changes must ship with the implementation they justify when both are part of the same logical change
- do not use meaningless commit subjects such as `update`, `misc`, or `fix stuff`

### Pull Request Expectations

Every PR should state:

- what changed
- which service or boundary is affected
- whether public contracts changed
- whether data ownership or runtime deployment is affected
- whether migrations, backfills, or rollout steps are required

If a PR changes architecture-sensitive behavior, it must reference the relevant source-of-truth docs.

## Anti-Patterns

Do not introduce these patterns:

- cross-service direct database reads
- shared package domain leakage
- fat controllers or fat handlers
- framework code inside `domain`
- query-only microservices with no bounded-context ownership
- using `Kafka` as workflow persistence
- storing raw telemetry in MongoDB as the main history store
- placing online inference hot-path dependencies on `Vertex AI`
- hiding critical contracts in untyped dictionaries or ad hoc payloads
- treating `Control Plane API and BFF` as a data-owning service

## Implementation Checklist

Before adding or changing a service, confirm:

1. the service belongs to an existing documented bounded context
2. the service owns its data boundary
3. the internal layers follow the dependency rule
4. public API and event contracts are explicit
5. tests cover the correct scope
6. CI tasks can run independently and from the monorepo root
7. architecture docs remain consistent with the implementation direction

## Cross-References

Read these files before implementing architecture-significant work:

- `AGENTS.md`
- `CONTRACTS.md`
- `FRONTEND.md`
- `OPS.md`
- `docs/service_decomposition.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/data_architecture.md`
- `docs/overview_architecture.md`

If implementation changes any of the assumptions encoded there, update the relevant docs in the same change.
