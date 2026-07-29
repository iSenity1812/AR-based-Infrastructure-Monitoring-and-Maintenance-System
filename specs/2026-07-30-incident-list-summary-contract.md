## Problem Statement

Technicians need the incident list API to show the operational picture quickly without forcing them to read raw monitoring payloads. The current incident list response returns the full incident record for every row, including captured snapshots, raw alert metadata, labels, annotations, and source references. That makes the list hard to scan, duplicates the detail endpoint's job, and overwhelms users who only need to decide which incident to open first.

## Solution

Change `GET /incidents` into a compact incident summary contract. Each row should answer what happened, where it happened, what is affected, the current incident severity and status, the primary alert signal, ticket count, and useful links. Full snapshots, raw labels, raw annotations, and debug provenance remain available through the future incident detail/debug design rather than the default list response.

## User Stories

1. As a technician, I want to scan incident summaries, so that I can quickly decide which incident needs attention first.
2. As a technician, I want each incident row to explain what happened, so that I do not need to parse raw alert metadata.
3. As a technician, I want each incident row to show where the issue happened, so that I can identify the affected site, room, rack, node, workload, or service.
4. As a technician, I want each incident row to show what is affected, so that I can understand blast radius before opening the detail page.
5. As a technician, I want severity and status to remain visible in the list, so that I can prioritize active critical work.
6. As a technician, I want ticket count visible in the list, so that I know whether workflow has already been created around the incident.
7. As a technician, I want dashboard and runbook links available when known, so that I can jump to investigation resources quickly.
8. As a backend engineer, I want the list contract to omit heavy raw monitoring internals, so that list responses stay small and predictable.
9. As a frontend engineer, I want a stable summary DTO, so that incident tables and cards do not depend on arbitrary metadata bags.
10. As an operator, I want the primary alert identity visible, so that I can recognize which monitoring signal created or best represents the incident.
11. As an API consumer, I want list and detail responses to have different contracts, so that I can fetch only the amount of data needed for the screen.
12. As a maintainer, I want full detail behavior preserved for now, so that this first slice does not accidentally redesign incident diagnosis, lifecycle, or postmortem support.

## Implementation Decisions

- `GET /incidents` returns compact incident list items instead of full incident responses.
- The list item includes stable top-level incident identity, severity, status, summary, scope, optional asset context, optional impact context, optional primary alert, ticket count, optional links, and timestamps.
- The list item intentionally excludes full `metadata`, full `capturedSnapshot`, raw labels, raw annotations, and source references.
- Summary fields are derived from existing incident metadata and captured snapshot data when available.
- Scope is derived first from captured snapshot scope, then from metadata scope fields for legacy incidents.
- Asset context is kept small and technician-facing: display name, site code, room code, and rack code.
- Impact context is kept small and numeric: affected nodes, total nodes, affected ratio, critical node count, and silent dead node count when present.
- Primary alert is represented as a compact signal object instead of a raw monitoring source blob.
- Create incident and get incident detail behavior remain unchanged in this slice.
- Pagination, multi-alert correlation, three-state lifecycle migration, incident detail diagnosis, and postmortem response design are deferred to later specs.

## Testing Decisions

- The highest useful test seam for this slice is the incident controller list behavior.
- Tests should verify externally observable response shape, not presenter helper implementation details.
- The controller list test should assert that compact summary fields are present.
- The controller list test should assert that full `metadata`, full `capturedSnapshot`, raw labels, and raw annotations are not returned by the list response.
- Existing create and detail controller tests should continue to prove that this change does not alter those behaviors.
- TypeScript build should pass for the service after the contract change.

## Out of Scope

- Redesigning `GET /incidents/:id`.
- Adding the explicit diagnosis/reason section to incident detail.
- Adding multi-alert aggregation.
- Changing the incident lifecycle enum to exactly `OPEN`, `RESOLVED`, and `CLOSED`.
- Adding pagination or total metadata to `GET /incidents`.
- Adding debug mode such as `includeDebug=true`.
- Changing persistence schema or incident creation deduplication.

## Further Notes

This is the first slice of the broader Incident API redesign. It creates a clean list/detail separation while preserving the current storage model and existing detail behavior. The next slice should define the incident detail contract around diagnosis, multiple alerts, simplified lifecycle, current state versus creation snapshot, and postmortem support.
