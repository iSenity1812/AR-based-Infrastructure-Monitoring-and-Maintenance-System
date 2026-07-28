# Simple Marker Lifecycle Spec

## Problem Statement

The current marker lifecycle is too complex for the AR MVP. Admin users need a
small state model that is easy to test manually and easy for AR scan logic to
understand.

## Solution

Replace the marker lifecycle with two states:

```text
INACTIVE <-> ACTIVE
```

Only `ACTIVE` markers can be resolved/scanned by AR. `INACTIVE` markers exist in
the system but must not be usable by AR clients.

## User Stories

1. As an admin, I want to create a marker as inactive, so that it is safe by default.
2. As an admin, I want to activate a marker, so that AR clients can scan it.
3. As an admin, I want to deactivate a marker, so that AR clients can no longer scan it.
4. As an admin, I want to remap a marker to another asset and make it inactive, so that the new binding must be explicitly activated.

## Implementation Decisions

- Marker lifecycle states become `INACTIVE` and `ACTIVE`.
- New markers start as `INACTIVE`.
- Activating a marker sets `lifecycleState = ACTIVE`, `isActive = true`, and `isVisibleInAr = true`.
- Deactivating a marker sets `lifecycleState = INACTIVE`, `isActive = false`, and `isVisibleInAr = false`.
- Remapping a marker sets it back to `INACTIVE`.
- AR marker resolution must reject any marker that is not `ACTIVE`.
- Retire, draft, generated, printed, mounted, validated, and remapped states are removed from the main lifecycle.

## API Impact

- Keep `POST /admin/markers`.
- Keep `POST /admin/markers/:markerId/activate`.
- Add `POST /admin/markers/:markerId/deactivate`.
- Keep `POST /admin/markers/:markerId/remap`.
- Remove or deprecate generate, print, mount, validate, and retire endpoints for MVP.

## Testing Decisions

- Test marker command/use-case behavior as the main seam.
- Test AR marker resolution rejects inactive markers.
- Test remap returns the marker to inactive.
- Do not test internal state-machine implementation details beyond externally visible state and scan behavior.

## Out of Scope

- Physical print/mount/validation workflow.
- Audit history for marker activation changes.
- A terminal retired state.
- Bulk marker operations.

## Further Notes

If permanent retirement is needed later, add a separate `retiredAt` or
`deletedAt` field rather than expanding the main AR lifecycle again.
