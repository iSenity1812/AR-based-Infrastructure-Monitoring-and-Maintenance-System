# 04 — List Work Orders Linked to an AR Asset

**What to build:** Allow the AR client to show existing work orders for the asset the technician is viewing. The BFF should resolve or verify the asset through Asset Service, query Incident Workflow Service for tickets linked through the existing asset reference contract, and return a normalized list suitable for an AR overlay.

**Blocked by:** 02 — Implement Marker Scan Resolution Through Asset Service.

**Status:** completed

- [x] The BFF exposes an AR asset work-order list endpoint for a resolved asset.
- [x] The endpoint resolves or verifies the asset through Asset Service before listing work orders.
- [x] The endpoint calls Incident Workflow Service rather than reading ticket persistence directly.
- [x] The endpoint uses the existing ticket asset reference concept as the asset anchor.
- [x] The returned work-order summary includes stable fields needed by the AR client: ticket ID, ticket code, title, priority, status, assignee summary when available, and linked asset reference.
- [x] The endpoint supports filtering to open/relevant tickets for the AR overlay, without hiding the ability to extend later to all tickets.
- [x] Ticket read failures are mapped to explicit availability metadata when used by later overlay composition.
- [x] Asset resolution failure blocks the endpoint because ticket listing must be anchored to a valid asset.
- [x] The BFF response is normalized and does not expose unnecessary Incident Workflow internals.
- [x] Tests cover listing work orders for a rack asset.
- [x] Tests cover listing work orders for a node asset.
- [x] Tests cover no linked work orders returning an empty list, not an error.
- [x] Tests cover Incident Workflow Service unavailable behavior.
- [x] Tests prove the BFF does not own ticket lifecycle state or status transition rules.
- [x] Any gap in the current Incident Workflow Service list/filter API for asset-linked tickets is documented as part of this ticket and handled with the narrowest compatible extension.

**Integration gap documented:** Incident Workflow Service does not currently expose first-class ticket filtering by `assetRef`. The AR BFF calls the existing ticket list endpoint and filters normalized summaries by `assetRef.assetId` as the narrowest compatible behavior.
