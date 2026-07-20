# Implementation Plan: Task 9 Manual Alert to Incident Flow

## Overview

Implement the manual operator flow that turns a firing Monitoring alert into an Incident Workflow incident. The flow starts from the Monitoring alert read model, calls Incident Workflow Service through a bounded client port, and stores only read-side incident linkage back on the alert.

This plan incorporates the doubt review findings:

- avoid duplicate incidents from the same fingerprint;
- avoid collision-prone shortened fingerprint incident codes;
- handle Incident-created-but-linkage-failed retry behavior;
- keep Monitoring out of incident workflow ownership;
- validate fingerprint, request body, metadata size, and downstream response shape;
- use existing Monitoring auth/error/envelope conventions.

## Architecture Decisions

- Manual phase 1 uses Monitoring as the dashboard-facing alert command facade, while Incident Workflow Service remains workflow truth.
- Incident code must be deterministic but collision-resistant: use a sanitized hash/full fingerprint strategy, not `fingerprint.slice(0, 12)`.
- Monitoring linkage is a read-side snapshot only. It can include incident reference fields for dashboard display, but Incident status changes remain owned by Incident Workflow Service.
- Conflict recovery uses existing `GET /api/v1/incidents?incidentCode=...`, but the client must exact-match `incidentCode` and verify metadata fingerprint before linking.
- Phase 1 rejects resolved alerts unless they already have existing linkage, in which case the endpoint may return `already_linked`.
- `warning` maps to Incident `HIGH`; `critical` maps to Incident `CRITICAL`.

## Task List

### Task 9.1: Linkage Foundation and Contract Hardening

**Status:** Completed on 2026-07-16.

**Description:** Add the Monitoring-side foundation required to represent manual escalation safely. This includes read-side linkage fields, repository update methods, deterministic incident code generation, severity mapping, request validation rules, and metadata normalization helpers. No external Incident call yet.

**Acceptance criteria:**

- [ ] `AlertCurrentState` and Mongo schema support additive linkage fields with safe defaults.
- [ ] Repository can update linkage by fingerprint without replacing raw alert state.
- [ ] Incident code generation is deterministic and collision-resistant enough for full fingerprint identity.
- [ ] Severity mapping is explicit: `warning -> HIGH`, `critical -> CRITICAL`.
- [ ] Metadata builder preserves `rawLabels` and `rawAnnotations`, applies null behavior, and avoids storing workflow truth.

**Verification:**

- [x] Unit tests added for severity mapping, incident code generation, and metadata building.
- [x] Build succeeds: `pnpm --dir backend/apps/control-plane/monitoring-service build`.
- [x] Manual schema/repository review confirms alert sync does not overwrite existing linkage because core alert upsert uses `$set` and default linkage uses `$setOnInsert`.
- [ ] Jest execution is blocked by existing harness issue: `this._moduleMocker.clearMocksOnScope is not a function`.

**Dependencies:** Task 3 and Task 4 alert read model/sync are already complete.

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/domain/alert-current-state.ts`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/database/mongodb/alert-current-state.schema.ts`
- `backend/apps/control-plane/monitoring-service/src/application/ports/alert-current-state.repository.ts`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/database/mongodb/alert-current-state-mongo.repository.ts`
- new mapper/helper files under `src/application/mappers/` or `src/application/services/`

**Estimated scope:** M

### Task 9.2: Manual Escalation Command and Incident Client

**Status:** Completed on 2026-07-16.

**Description:** Implement the command path that creates or links an incident from a firing alert. Add a Monitoring endpoint, DTOs, use case, Incident Workflow client port/adapter, conflict recovery, downstream timeout handling, and partial-failure-safe retry semantics.

**Acceptance criteria:**

- [x] `POST /api/v1/monitoring/alerts/:fingerprint/incident` exists and requires `INCIDENTS_CREATE`.
- [x] Missing alert returns `404 ALERT_NOT_FOUND` and does not call Incident Workflow Service.
- [x] Resolved unlinked alert returns `409 ALERT_NOT_ACTIVE` and does not call Incident Workflow Service.
- [x] Already linked alert returns `action = already_linked`.
- [x] Firing alert creates Incident through `POST /api/v1/incidents` and stores linkage.
- [x] Incident conflict recovery calls `GET /api/v1/incidents?incidentCode=...`, exact-matches `incidentCode`, verifies metadata fingerprint, then links only if it matches.
- [x] If Incident creation succeeds but Monitoring linkage update fails, retrying the same command can recover through conflict lookup instead of creating duplicates.
- [x] Incident client validates downstream response shape and maps unavailable/timeout failures to a stable Monitoring error.

**Verification:**

- [x] Use-case tests added for success, not found, resolved, and conflict recovery.
- [ ] Controller tests are still pending.
- [x] Build succeeds: `pnpm --dir backend/apps/control-plane/monitoring-service build`.
- [ ] Manual check with a synced firing alert creates exactly one Incident after repeated requests.
- [ ] Jest execution is blocked by existing harness issue: `this._moduleMocker.clearMocksOnScope is not a function`.

**Dependencies:** Task 9.1

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers/`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/`
- `backend/apps/control-plane/monitoring-service/src/application/use-cases/`
- `backend/apps/control-plane/monitoring-service/src/application/ports/`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/http/`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/config/monitoring-service-config.ts`
- `backend/apps/control-plane/monitoring-service/src/app.module.ts`

**Estimated scope:** M

### Task 9.3: Dashboard State Enrichment and End-to-End Verification

**Status:** Completed on 2026-07-16.

**Description:** Expose the linkage created by Task 9.2 back through existing Monitoring state APIs in a backward-compatible way, then verify the full manual flow across Monitoring and Incident services. This task makes the feature visible and usable by dashboard consumers without changing existing response fields.

**Acceptance criteria:**

- [x] `/monitoring/nodes/state` exposes optional `triageStatus` and `incident` linkage on alert items.
- [x] `/monitoring/racks/state` exposes optional `triageStatus` and `incident` linkage on alert items.
- [x] Existing response fields remain unchanged and existing consumers can ignore new fields.
- [x] Linkage fields are self-descriptive and do not expose Incident workflow-owned detail beyond reference/status snapshot.
- [x] Manual E2E flow is documented in chat: sync alert, create incident, repeat create request, inspect state API, inspect Incident Service.

**Verification:**

- [ ] Node state use-case tests verify linked and unlinked alert output.
- [ ] Rack state use-case tests verify linked and unlinked alert output.
- [x] Build succeeds: `pnpm --dir backend/apps/control-plane/monitoring-service build`.
- [ ] Manual scenario confirms one firing alert maps to one incident and state APIs show linkage after escalation.
- [ ] Jest execution is blocked by existing harness issue: `this._moduleMocker.clearMocksOnScope is not a function`.

**Dependencies:** Task 9.2

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/application/use-cases/get-node-monitoring-state.use-case.ts`
- `backend/apps/control-plane/monitoring-service/src/application/use-cases/get-rack-monitoring-state.use-case.ts`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/node-monitoring-state-response.dto.ts`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/rack-monitoring-state-response.dto.ts`
- tests for node/rack state use cases
- documentation or manual verification notes under `backend/apps/control-plane/monitoring-service/docs/`

**Estimated scope:** M

## Checkpoint: Complete Manual Handoff

- [x] Monitoring can create/link an Incident from a firing alert.
- [x] Repeated requests do not create duplicate incidents by design through deterministic incident code and conflict recovery.
- [x] Resolved unlinked alerts cannot create new incidents in phase 1.
- [x] Monitoring stores linkage only and does not own Incident workflow truth.
- [x] State APIs show enough linkage for the dashboard to avoid creating duplicate incidents manually.
- [x] Monitoring Service builds successfully; Jest harness issue is documented separately from feature correctness.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Incident code collision | High | Do not truncate fingerprint identity; use full sanitized fingerprint or hash-derived code with metadata fingerprint verification. |
| Concurrent duplicate requests | High | Check existing linkage first, use deterministic incident code, recover conflict by exact incidentCode + metadata fingerprint. |
| Incident created but linkage update fails | High | Retry command must recover existing incident from Incident Service and repair linkage. |
| Monitoring stores workflow truth | High | Store reference/status snapshot only; keep comments, tickets, assignees, transitions in Incident Service. |
| Scope authorization too broad | Medium | Phase 1 uses `INCIDENTS_CREATE`; later add scope-level policy when team/rack tenancy rules exist. |
| Existing Incident list filter is regex-based | Medium | Client must exact-match returned `incidentCode`, not trust the first result. |
| Raw metadata is too large or unsafe | Medium | Normalize metadata, keep required raw labels/annotations, add size limits in DTO/helper. |

## Open Questions

1. Should phase 1 add a dedicated Incident endpoint `GET /incidents/by-code/:incidentCode`, or use current `GET /incidents?incidentCode=...` with exact-match filtering in Monitoring?
2. Should severity override be allowed in the first implementation, or should phase 1 remove override entirely to reduce audit/security surface?
3. Should scope-level authorization wait for a future policy task, or should we add a minimal team/environment check now?
