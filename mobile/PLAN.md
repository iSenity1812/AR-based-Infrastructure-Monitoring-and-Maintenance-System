# Mobile Development Plan

## Product Direction

The mobile app is a technician-only field workspace focused on workflows that benefit from a handheld device:

- technician ticket handling
- incident context embedded into related tickets
- evidence capture and upload
- technician-scoped workflow actions
- asset QR scanning through the central camera action, followed by an asset-specific WebAR handoff

The visual language follows a modern industrial field-service system: rounded operational cards, calm enterprise accents, strong information hierarchy, focused data visualization, and complete light/dark modes.

## Phase 1 - Ticket and Incident Flow

Current implementation covers:

- login and persisted session
- demo operator and technician sessions for UI testing
- role-aware navigation
- ticket list with operator/technician filtering
- ticket create form for operators
- ticket assignment action for dispatch-capable roles
- technician acknowledge action
- ticket comments
- evidence image selection and Cloudflare R2 presigned upload flow
- incident list and incident detail
- profile with roles and permissions

## Phase 2 - Backend Hardening

Recommended next work:

- add refresh-token handling
- add global request retry and auth-expiry handling
- add typed error banners instead of alerts
- normalize API DTOs if backend response shapes change
- add endpoint support for ticket start work, resolve, close, and cancel
- add incident status transition once backend supports it

## Phase 3 - Field UX

Recommended next work:

- camera capture flow in addition to image-library picking
- offline draft comments and evidence queue
- ticket metadata entry point for asset-specific WebAR context
- route from asset context to active tickets
- technician task filters: assigned, acknowledged, in progress, resolved

## Phase 4 - AR Inspection

Recommended next work:

- in-app QR scanner and camera permission flow (implemented)
- marker resolution through asset-service
- asset telemetry snapshot panel
- inspection checklist
- evidence capture directly from inspection session

## Folder Ownership

- `app/`: route files only, thin screen composition
- `src/api/`: backend API calls and DTO normalization
- `src/auth/`: session, permissions, auth helpers
- `src/components/`: reusable visual primitives
- `src/constants/`: permission and enum constants
- `src/mocks/`: demo data for UI-only testing
- `src/theme/`: colors, spacing, radii, typography
- `src/types/`: shared TypeScript domain models
- `src/features/`: add this when flows grow beyond route-level screens

## Role Model

- Monitoring Operator:
  - create tickets
  - assign tickets
  - read tickets and incidents
  - update ticket workflow status when backend supports the action

- Maintenance Technician:
  - read assigned tickets
  - acknowledge assigned tickets
  - add comments
  - attach evidence
  - resolve work when backend supports the action

- IT Administrator:
  - can use operator workflows and future administrative views
