# 05 — Create AR Work Order Using Existing `assetRef`

**What to build:** Let a technician create a work order from the AR flow for the scanned rack or node. The BFF should resolve or verify the asset through Asset Service, construct the existing Incident Workflow Service `assetRef` payload, forward the user's authorization context, and return the created ticket in a normalized AR-facing response.

**Blocked by:** 02 — Implement Marker Scan Resolution Through Asset Service.

**Status:** completed

- [x] The BFF exposes an AR asset work-order creation endpoint.
- [x] The endpoint requires the same effective permission boundary as creating a ticket in Incident Workflow Service.
- [x] The endpoint resolves or verifies the asset through Asset Service before creating a ticket.
- [x] The endpoint sends Incident Workflow Service a create-ticket request that includes the existing `assetRef` contract.
- [x] The `assetRef` includes asset type, asset ID, asset code, and display name.
- [x] For node assets, the `assetRef` includes parent rack ID and rack code when available.
- [x] For rack assets, the `assetRef` does not require node-only context.
- [x] The endpoint forwards the user's authorization context to Incident Workflow Service.
- [x] Incident Workflow Service remains responsible for ticket code uniqueness, status defaults, assignment behavior, lifecycle rules, comments, evidence, and permission enforcement.
- [x] The BFF maps validation, conflict, forbidden, and unavailable errors from Incident Workflow Service into stable AR-facing errors.
- [x] The response includes a normalized created work-order summary suitable for immediate AR display.
- [x] Tests cover creating a work order for a rack asset.
- [x] Tests cover creating a work order for a node asset with rack context.
- [x] Tests verify the exact downstream intent includes the resolved `assetRef`.
- [x] Tests cover unauthorized or forbidden creation behavior.
- [x] Tests cover Asset Service resolution failure without calling Incident Workflow Service.
- [x] Tests cover Incident Workflow Service conflict or validation failure behavior.
- [x] The implementation does not introduce workflow execution or maintenance-procedure ownership into this feature.
