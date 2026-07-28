# Spec: Monitoring Alert Incident Handoff Audit Boundary

## Objective
Add trustworthy operator audit context to `POST /monitoring/alerts/:fingerprint/incident` before changing the distributed handoff model.

This slice exists to solve the immediate audit gap:
- Monitoring currently accepts `operatorNote`, but does not persist who initiated the escalation.
- Authorization is already enforced server-side, so actor identity should be derived from auth context rather than trusted from request body.

Primary user:
- Operators and auditors who need to know who escalated an alert into incident workflow, when, and with what override intent.

Success for this slice:
- The endpoint captures authenticated actor identity server-side.
- Monitoring persists or emits a durable audit record for escalation attempts/results.
- Incident metadata sent downstream includes normalized actor context.

This slice intentionally does **not** solve the full distributed consistency problem yet. That will require a second spec for `incident_pending + reconciliation` or `outbox/event-driven handoff`.

## Tech Stack
- NestJS monitoring service
- TypeScript
- MongoDB-backed alert current state repository
- HTTP integration to Incident Workflow Service
- Existing JWT auth guard and permissions guard

## Commands
Build: `pnpm run build`
Test: `pnpm test -- --runTestsByPath src/application/use-cases/create-incident-from-alert.use-case.spec.ts`
Test all monitoring: `pnpm test`
Dev: `pnpm dev`

Working directory for commands:
- `backend/apps/control-plane/monitoring-service`

## Project Structure
- `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers`
  HTTP endpoint boundary and auth-context extraction
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto`
  Request/response DTOs only; actor identity must not be added to public body DTO
- `backend/apps/control-plane/monitoring-service/src/application/use-cases`
  Handoff orchestration and audit result handling
- `backend/apps/control-plane/monitoring-service/src/application/mappers`
  Downstream incident metadata mapping
- `backend/apps/control-plane/monitoring-service/src/application/ports`
  New audit port or audit event port if needed
- `backend/apps/control-plane/monitoring-service/src/domain`
  Alert linkage state only; avoid overloading it with full audit history
- `docs/superpowers/specs`
  Decision and rollout specs

## Code Style
Actor identity must come from server-side auth context and be passed explicitly as a structured object.

```ts
type AlertEscalationActor = {
  userId: string;
  username?: string;
  email?: string;
  displayName?: string;
};

await this.createIncidentFromAlertUseCase.execute({
  fingerprint,
  authorizationHeader,
  correlationId,
  operatorNote: input.operatorNote,
  severityOverride: input.severityOverride,
  actor,
});
```

Conventions:
- Do not trust `operatorId` or actor fields from request body.
- Keep controller responsible for extracting auth context, not business rules.
- Keep use case responsible for validating required actor identity for audit emission.
- Prefer additive metadata/audit records over mutating unrelated alert fields.

## Testing Strategy
- Unit tests for controller auth-context extraction
- Unit tests for use case passing actor context into:
  - incident metadata
  - audit persistence/emission
- Unit tests for mapper output shape
- Unit tests for failure/result audit semantics:
  - `created`
  - `already_linked`
  - `linked_existing`
  - downstream unavailable/conflict failure paths

Expected test locations:
- `src/presentation/http/controllers/*.spec.ts`
- `src/application/use-cases/*.spec.ts`
- `src/application/mappers/*.spec.ts`

## Boundaries
- Always:
  - Derive actor from authenticated request context
  - Keep `operatorNote` as business input, separate from audit identity
  - Include actor context in downstream incident metadata
  - Create a durable audit record or audit event for escalation attempts/results
- Ask first:
  - Adding a new Mongo collection/table for audit history
  - Reusing or integrating an external Audit Service
  - Changing JWT payload contract across services
  - Expanding public API response to expose actor audit fields
- Never:
  - Accept actor identity from request body as source of truth
  - Treat `operatorNote` as a substitute for audit
  - Bundle outbox/reconciliation redesign into this first audit slice
  - Overwrite alert linkage state with append-only audit history

## Success Criteria
- `POST /monitoring/alerts/:fingerprint/incident` continues to accept the same public body shape.
- The controller extracts authenticated actor context from the request principal.
- The use case receives a non-body `actor` object.
- Incident metadata includes:
  - `requestedBy`
  - `requestedAt`
  - `operatorNote` when supplied
- Monitoring produces a durable audit trail with at least:
  - `fingerprint`
  - `action`
  - `actorUserId`
  - `actorDisplayName` or fallback username
  - `severityOverride`
  - `operatorNote`
  - `correlationId`
  - `requestedAt`
  - `result`
- Existing endpoint semantics for `created`, `already_linked`, and `linked_existing` remain unchanged.

## Boundary Decision
The first implementation boundary should be:

1. Extract actor from JWT/auth context in controller
2. Extend use case command with `actor`
3. Extend incident metadata mapper with normalized actor audit payload
4. Persist or emit audit record from monitoring for escalation intent/result

This boundary is chosen first because:
- it closes a real compliance/audit gap immediately
- it is local to monitoring-service
- it does not require redefining cross-service transaction behavior yet
- it reduces risk before the larger handoff redesign

The following items are intentionally deferred to the next boundary:
- `incident_pending` triage state
- reconciliation job
- outbox/event-driven incident handoff
- remote idempotent recovery beyond current `incidentCode` logic

## Open Questions
- Where should the durable audit trail live for phase 1?
  - local monitoring collection
  - existing audit service/event
- What exact request principal shape is available after `JwtAuthGuard` in this repo?
- Is `userId` guaranteed in JWT, or do we need fallback precedence across `sub`, `id`, `userId`?
- Should audit be emitted for both success and failure attempts, or only after business validation passes?
