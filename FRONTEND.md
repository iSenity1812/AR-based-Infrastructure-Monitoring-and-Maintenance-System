# FRONTEND.md

## Purpose

`FRONTEND.md` defines frontend architecture and implementation standards for this repository.

It translates the product and system architecture from `docs/*` into frontend-specific guidance for:

- application boundaries
- frontend stack choices
- WebAR integration
- state and data access
- component and folder structure
- testing
- delivery and runtime expectations

This file does not redefine backend architecture, service ownership, or the WebAR decision already fixed in `docs/*` and `AGENTS.md`.

## Governance and Precedence

Use the following precedence model:

1. `docs/*` is the source of truth for product intent, logical architecture, service boundaries, and terminology.
2. `AGENTS.md` defines contributor and agent behavior.
3. `ENGINEER.md` defines cross-repo implementation and delivery conventions.
4. `CONTRACTS.md` defines transport and contract rules.
5. `OPS.md` defines runtime and operations standards.
6. `FRONTEND.md` defines frontend-specific architecture and implementation rules.

If a frontend choice conflicts with `docs/*`, follow `docs/*` and update this file in the same change.

## Frontend Baseline

The frontend baseline for this repository is:

- `Next.js` for browser-facing frontend applications
- `React` as the component model
- `Tailwind CSS` for styling and design tokens
- `Three.js` for 3D scene rendering and spatial overlays
- `WebAR` as the AR delivery model
- `AR.js` or `8th Wall` as the WebAR runtime layer
- `React Native` with `Expo` as an optional companion mobile app stack

Critical rule:

- the canonical AR client remains `WebAR Client`, which is browser-based
- `React Native/Expo` is not the default AR runtime for this platform

## Frontend Application Boundaries

Use these logical frontend surfaces:

- `Web Dashboard`
- `WebAR Client`
- optional `Expo Companion App`

### `Web Dashboard`

Purpose:

- operator and administrator workflows
- topology and asset views
- monitoring views
- incident and ticket workflows
- simulation control

Baseline runtime:

- `Next.js`
- server-rendered or hybrid-rendered web app

### `WebAR Client`

Purpose:

- QR marker scan entry
- marker resolution flow
- diagnostics bundle rendering
- contextual maintenance workflow
- inspection submission

Baseline runtime:

- browser-based WebAR experience
- launched from mobile browser or device browser-capable shell

Hard constraints:

- `WebAR Client` must not read raw telemetry directly
- `WebAR Client` reads through the `Control Plane API and BFF`
- marker resolution happens through backend APIs, not local static mappings

### `Expo Companion App`

Purpose:

- optional mobile shell
- authentication convenience
- deep linking into dashboard or WebAR routes
- notification or workflow utilities outside the AR rendering path

Allowed use cases:

- open `WebAR Client` in system browser or in-app web surface
- provide mobile navigation and session continuity
- provide non-AR operational views if needed later

Not allowed as a baseline assumption:

- replacing browser-based WebAR with native AR as the default field client

## Stack Decision Logic

### Next.js

Use `Next.js` as the default frontend framework because it supports:

- route-based application structure
- hybrid rendering
- easy separation of dashboard and WebAR surfaces
- good fit for monorepo packaging and deployment

Recommended use:

- dashboard app
- WebAR app shell
- shared frontend packages

### Tailwind CSS

Use `Tailwind CSS` for:

- utility-first styling
- tokenized spacing, color, and typography
- consistent design primitives across dashboard and WebAR shell

Rules:

- centralize theme tokens
- avoid scattered magic values
- keep reusable UI primitives in shared frontend packages when justified

### Three.js

Use `Three.js` for:

- spatial overlays
- 3D annotation layers
- scene composition for WebAR visualization

Rules:

- isolate rendering logic from business workflow logic
- keep scene adapters separate from API orchestration
- do not mix diagnostics-fetching code directly inside low-level scene objects

### AR.js vs 8th Wall

Both are allowed, but the default recommendation is:

- `AR.js` for PoC, budget-sensitive, and self-managed WebAR work
- `8th Wall` when device coverage, robustness, or commercial-grade tracking quality justify the external dependency and cost

Decision rule:

- if the team prioritizes low cost and architecture control, start with `AR.js`
- if the team prioritizes broader mobile browser support and stronger WebAR runtime polish, use `8th Wall`

Implementation rule:

- keep the WebAR runtime behind a small frontend adapter boundary so `AR.js` and `8th Wall` can be swapped without rewriting workflow code

### React Native and Expo

Use `React Native/Expo` only for optional companion mobile functionality.

Recommended use:

- auth handoff
- deep links
- mobile notifications
- workflow shortcuts
- camera permission preflight helpers if needed

Do not assume:

- native AR scene rendering is the primary path
- Expo replaces the browser-based WebAR client

## Monorepo Frontend Structure

Recommended top-level structure:

```text
/
|- apps/
|  |- frontend/
|  |  |- web-dashboard/
|  |  |- webar-client/
|  |  \- expo-companion/
|- packages/
|  |- frontend-ui/
|  |- frontend-contracts/
|  |- frontend-config/
|  \- frontend-utils/
```

Interpretation rules:

- `web-dashboard` is the operator and admin UI
- `webar-client` is the canonical AR field interface
- `expo-companion` is optional and must not become a hidden replacement for WebAR
- shared UI and frontend utility packages must remain presentation-oriented

Do not place:

- backend business rules in frontend packages
- AR runtime-specific hacks in shared generic UI packages

## Internal Frontend Structure

Recommended structure for each Next.js frontend app:

```text
src/
|- app/
|- features/
|- components/
|- lib/
|- hooks/
|- services/
|- state/
|- types/
\- tests/
```

### Layer Intent

`app/`

- routes
- layouts
- page entrypoints
- route-level composition

`features/`

- business-facing frontend modules
- dashboard workflows
- WebAR diagnostics flow
- inspection workflow UI

`components/`

- reusable presentational UI
- low-level visual building blocks

`lib/`

- framework helpers
- runtime adapters
- WebAR adapter integration
- Three.js scene utilities

`hooks/`

- view-model hooks
- request state hooks
- interaction hooks

`services/`

- API clients
- transport adapters
- contract mapping logic

`state/`

- client-side state containers
- cache coordination
- session-scoped UI state

`types/`

- transport-safe DTOs
- frontend-only type helpers

## Frontend Architecture Rules

Required rules:

- keep route components thin
- isolate API access in `services/`
- isolate AR runtime integration in `lib/` or a dedicated adapter layer
- keep rendering logic separate from workflow and API orchestration
- map backend responses into frontend-safe view models before UI rendering
- keep QR scan, marker resolve, diagnostics fetch, and inspection submit as separate flow steps in code

Forbidden patterns:

- raw fetch calls scattered across random components
- direct business logic in page files
- scene objects making backend calls directly
- coupling WebAR runtime APIs to unrelated dashboard modules
- assuming telemetry semantics in UI without going through backend contracts

## Data Access and State

### API Access

Frontend must follow `CONTRACTS.md`.

Rules:

- all backend calls go through typed service clients
- use one mapping layer between transport DTOs and UI view models
- keep `correlationId` propagation available where frontend initiates workflows

The frontend should interact primarily with:

- `Control Plane API and BFF`
- public REST endpoints
- realtime gateway only where the architecture already allows it

### State Strategy

Use a layered state model:

- server state for API-backed data
- local UI state for interaction and transient controls
- session state for auth and active workflow context

Recommended principles:

- prefer server data caching over duplicating backend truth
- keep derived UI state local to feature modules when possible
- avoid one global store for everything unless truly justified

### Realtime

Use realtime updates only where the workflow benefits:

- dashboard alert refresh
- ticket status refresh
- optional live WebAR refresh for active inspection context

Do not make realtime transport mandatory for the first version of every screen.

## WebAR Integration Model

### Canonical Flow

The WebAR flow should be implemented as:

1. user enters `WebAR Client`
2. browser requests camera permissions
3. QR marker is detected
4. frontend calls backend to resolve marker
5. frontend fetches diagnostics bundle
6. frontend renders overlay and maintenance context
7. frontend submits inspection result through backend

### Adapter Boundary

The AR runtime must be wrapped behind an adapter boundary.

Recommended abstraction:

- `camera adapter`
- `marker detection adapter`
- `scene adapter`
- `overlay interaction adapter`

This allows:

- `AR.js` and `8th Wall` to be swapped
- testing of workflow logic without booting the real AR runtime

### Performance Rules

WebAR-specific rules:

- keep diagnostics payloads compact
- lazy-load heavy AR dependencies
- defer non-critical panels until after scene readiness
- avoid blocking scan-to-overlay flow on unnecessary secondary requests
- keep Three.js scene updates incremental where possible

## Testing Strategy

Frontend testing should align with `ENGINEER.md`, specialized for UI and WebAR.

Required layers:

- unit tests for pure UI logic, hooks, mappers, and adapters
- component tests for reusable UI and feature modules
- contract tests for API client expectations against `CONTRACTS.md`
- end-to-end tests for critical dashboard and WebAR flows

### Critical Frontend Scenarios

Minimum critical scenarios:

- dashboard login and protected route access
- alert queue or monitoring summary render
- WebAR marker scan to diagnostics flow
- inspection submission flow
- degraded API response and error rendering

### WebAR Test Guidance

Rules:

- mock runtime-specific camera and marker APIs in unit and component tests
- keep AR runtime integration behind an adapter so it can be stubbed
- cover scene-independent workflow logic without requiring real device hardware

## Delivery and Runtime Expectations

### Build Targets

Expected frontend deployables:

- `web-dashboard` as a Next.js web app
- `webar-client` as a Next.js web app optimized for mobile browser usage
- optional `expo-companion` mobile build

### Deployment Expectations

Frontend runtime must align with `OPS.md`.

Rules:

- browser apps deploy with the same runtime discipline as other platform services
- public routing should be explicit at ingress level
- WebAR routes must be HTTPS-only in any real deployment because browser camera access depends on secure context

### Observability

Frontend should emit enough telemetry to support:

- request correlation
- user-visible failure analysis
- WebAR flow timing
- route-level performance monitoring

Recommended signals:

- route latency
- API error rate
- diagnostics bundle load time
- scan-to-overlay latency
- inspection submit success/failure rate

## Anti-Patterns

Do not introduce these patterns:

- treating `React Native/Expo` as the default AR client
- coupling WebAR workflow to native-only APIs
- putting business orchestration directly in page components
- mixing dashboard and WebAR runtime concerns in one feature module without boundaries
- binding UI directly to raw backend payloads without mapping
- forcing a single global client state container for every concern
- embedding AR vendor-specific logic across the whole codebase

## Frontend Review Checklist

Before adding or changing frontend behavior, confirm:

1. the change preserves `WebAR Client` as the browser-based default
2. the route or feature matches the documented bounded context
3. API access follows `CONTRACTS.md`
4. WebAR runtime code is isolated behind an adapter
5. state placement is local and intentional
6. the flow is testable without real device-only dependencies
7. the change does not bypass backend composition or data ownership boundaries

## Cross-References

Read these files before implementing frontend-significant work:

- `AGENTS.md`
- `ENGINEER.md`
- `CONTRACTS.md`
- `OPS.md`
- `docs/overview_architecture.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/requirements.md`

If frontend changes imply architecture changes, update the relevant `docs/*` files in the same change.
