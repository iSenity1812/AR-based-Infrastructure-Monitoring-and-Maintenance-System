# Spec: Rack Monitoring Socket.IO Realtime Delta

## Assumptions I'm Making

1. This spec covers `Task 10` only: realtime delivery for `rack` monitoring state changes in phase 1.
2. The existing `monitoring-service` remains the owner of realtime monitoring composition and outbound Socket.IO delivery.
3. `Task 9` is the baseline snapshot contract, and realtime payloads should stay close to that shape instead of inventing a separate UI model.
4. Phase-1 realtime should emit only `meaningful monitoring deltas`, not raw polling heartbeats and not raw telemetry streams.
5. `activate` and `resolve` are the only required rack lifecycle events for the MVP realtime path.
6. `repeated_active` should not emit in the MVP unless the team later decides to surface notification resync transitions separately.
7. Frontend consumers will use `REST snapshot first, Socket.IO deltas second`, not Socket.IO as the only source of truth.

If any of these are wrong, the spec should be revised before implementation.

## Objective

Add a realtime delivery path for rack monitoring so operators can see high-signal state changes on the dashboard without refreshing the page or reloading the full overview payload.

The target user is the `Operator` watching the monitoring dashboard and triaging infrastructure issues.

Success means:

- a rack entering an actionable state produces one UI-facing Socket.IO event
- a rack resolving produces one UI-facing Socket.IO event
- repeated polling cycles do not spam the UI with duplicate events
- realtime payloads preserve the same separation introduced in Task 9:
  - `operational state`
  - `notification state`

## Tech Stack

- `NestJS` for the monitoring microservice
- `Socket.IO` as the realtime delivery transport
- `MongoDB`-backed internal monitoring state as the backend operational truth
- `ClickHouse summary views` as the upstream evaluation source
- `Alertmanager` as the notification lifecycle engine already bridged by Task 8

Relevant existing backend components:

- `PollRackMonitoringUseCase`
- `DispatchRackAlertTransitionUseCase`
- `GetRackMonitoringStateUseCase`
- `MonitoringStateRepository`
- rack monitoring REST endpoint from Task 9

## Commands

These are the most relevant repository commands for this spec and the expected implementation:

```powershell
# Review monitoring-service application flow
Get-Content -Raw backend/apps/control-plane/monitoring-service/src/application/use-cases/poll-rack-monitoring.use-case.ts
Get-Content -Raw backend/apps/control-plane/monitoring-service/src/application/use-cases/dispatch-rack-alert-transition.use-case.ts
Get-Content -Raw backend/apps/control-plane/monitoring-service/src/application/use-cases/get-rack-monitoring-state.use-case.ts

# Search for websocket or gateway usage
rg -n "@WebSocketGateway|Gateway|Socket|emit\\(" backend/apps/control-plane/monitoring-service/src

# Build monitoring-service
pnpm --dir backend/apps/control-plane/monitoring-service build

# Focused tests for monitoring realtime path
pnpm --dir backend/apps/control-plane/monitoring-service test -- --runInBand src/application/use-cases/*.spec.ts src/presentation/**/*.spec.ts
```

## Project Structure

This spec assumes the realtime feature will stay inside the current `monitoring-service` boundary:

```text
backend/apps/control-plane/monitoring-service/src/application/
  use-cases/          -> polling orchestration, dispatch orchestration, realtime emit orchestration
  ports/              -> outbound realtime emitter contract if needed
  mappers/            -> transition/state to realtime payload mapping

backend/apps/control-plane/monitoring-service/src/presentation/
  http/               -> existing REST snapshot endpoints
  websocket/          -> Socket.IO gateway or emitter adapter for rack monitoring events

backend/apps/control-plane/monitoring-service/src/domain/
  monitoring-state.ts -> backend monitoring truth model

docs/superpowers/specs/
  2026-07-08-rack-monitoring-socketio-realtime-design.md -> this spec
```

## Code Style

This feature should preserve the same explicit contract style already used in Task 9:

- backend composes the payload
- framework transport stays in `presentation`
- application layer decides whether a state change is meaningful enough to emit
- payload naming should be direct and readable rather than generic

Example shape:

```ts
type RackMonitoringStateChangedEvent = {
  eventName: 'monitoring.rack.state.changed';
  rackId: string;
  changedAt: string;
  transitionKind: 'activate' | 'resolve';
  operational: {
    severityCode: number;
    overrideFlag: boolean;
    lifecycleStatus: 'active' | 'resolved';
    fingerprint: string;
  };
  notification: {
    syncStatus:
      | 'idle'
      | 'pending_open'
      | 'open_synced'
      | 'pending_resolve'
      | 'resolve_synced'
      | 'sync_failed';
  };
};
```

Key conventions:

- reuse Task 9 response concepts where possible
- keep event names namespaced by scope
- emit deltas, not full dashboard snapshots
- do not place transport-specific logic inside domain rules

## Testing Strategy

Task 10 should be verified at three levels:

### 1. Policy tests

Validate when the system is allowed to emit:

- `activate` => emit
- `resolve` => emit
- `noop` => do not emit
- `repeated_active` => do not emit in MVP

### 2. Payload mapping tests

Validate that the outbound Socket.IO payload:

- is derived from backend monitoring state
- carries `operational` and `notification` separately
- includes enough rack identity for UI patching

### 3. Realtime wiring tests

Validate that:

- one meaningful rack transition triggers one gateway emission
- no duplicate emit happens for repeated polling matches
- the application layer calls the realtime emitter without depending directly on Socket.IO internals

Because the current repo has an existing Jest runtime harness issue, the immediate implementation may rely on:

- build verification
- focused spec files
- added test files that become executable once the harness issue is fixed

## Boundaries

- Always:
  - Emit realtime events only from backend-owned monitoring state.
  - Keep realtime payloads aligned with the Task 9 rack monitoring state contract.
  - Emit only on meaningful rack lifecycle transitions in phase 1.
  - Treat REST as the snapshot source and Socket.IO as the delta source.

- Ask first:
  - Emitting `repeated_active` or notification-resync-only events in phase 1
  - Broadcasting full overview snapshots over Socket.IO instead of deltas
  - Adding subscription rooms, filtering semantics, or per-user scoped channels
  - Moving realtime emission to a separate service or external broker in phase 1

- Never:
  - Stream raw telemetry rows over Socket.IO
  - Emit every polling cycle regardless of semantic change
  - Make frontend reconstruct monitoring truth from Alertmanager-only events
  - Treat Socket.IO as the sole source of monitoring truth

## Realtime Event Model

### 1. Event scope

Phase 1 covers only:

- `rack`

Proposed event name:

- `monitoring.rack.state.changed`

### 2. Event trigger policy

The MVP trigger policy is:

- emit on `activate`
- emit on `resolve`
- do not emit on `noop`
- do not emit on `repeated_active`

This policy exists to preserve signal quality for operators and avoid UI churn caused by repeated polling evaluations that do not materially change the rack's state.

### 3. Event payload principles

The event payload should:

- be a `delta-oriented UI patch payload`
- carry stable rack identity
- separate operational health from alert synchronization state
- reuse the same semantic vocabulary already exposed in Task 9

The event payload should not:

- include raw ClickHouse fields that frontend must reinterpret
- include full dashboard lists
- include unrelated scope data

### 4. Event composition source

Realtime payloads should be composed from:

- `MonitoringTransition`
- `MonitoringState`
- `RackContextProvider` enrichment when needed

They should not be composed directly from:

- raw ClickHouse rack summary rows
- Alertmanager webhook response bodies

## Proposed Phase-1 Flow

```text
ClickHouse rack summary
    -> PollRackMonitoringUseCase
    -> MonitoringTransition
    -> DispatchRackAlertTransitionUseCase
    -> Monitoring state persisted / sync state updated
    -> Realtime emission policy check
    -> Socket.IO event emitted
```

### Preferred orchestration rule

For phase 1, realtime emission should happen after the meaningful transition has already been accepted by backend orchestration, so the UI sees a backend-confirmed state change rather than a speculative polling candidate.

## API / UX Contract Strategy

The frontend contract should be:

- `REST`
  - initial snapshot
  - manual resync fallback
- `Socket.IO`
  - incremental rack state deltas
  - no page reload needed

This means dashboard clients should:

1. load initial rack monitoring state from Task 9 endpoint
2. subscribe to rack monitoring realtime events
3. patch local store when `monitoring.rack.state.changed` arrives

## Success Criteria

This spec is successful if the team can proceed to implementation with these statements accepted as true:

- rack realtime delivery is delta-based, not snapshot-stream-based
- only meaningful rack state changes emit Socket.IO events in phase 1
- realtime payloads are derived from backend monitoring state, not raw telemetry
- the frontend can combine:
  - Task 9 snapshot endpoint
  - Task 10 Socket.IO deltas
- `monitoring-service` remains the owner of monitoring realtime composition

## Open Questions

- Should phase 1 emit realtime events only after successful Alertmanager dispatch, or after the backend monitoring transition is persisted regardless of Alertmanager delivery outcome?
- Do we want a separate event in a later phase for `notification sync state changed` without operational lifecycle change?
- Should phase 1 expose a single broadcast channel for all rack viewers, or introduce scope-specific rooms only when frontend actually needs them?
