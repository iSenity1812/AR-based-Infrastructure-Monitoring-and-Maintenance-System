# Asset Service API Contract

## Scope

This document describes the current frontend-facing REST contract implemented in `backend/apps/control-plane/asset-service`.

The codebase uses the service directory name `asset-service`, while higher-level architecture docs often describe this bounded context as `Asset Context Service`. This document follows the concrete code path and route behavior currently implemented.

## Service Basics

- Service name: `asset-service`
- Current global prefix: `/api/v1`
- Swagger path when enabled: `/api/v1/docs`
- Primary responsibility: topology queries, rack and node lifecycle commands, marker lifecycle commands, and marker-based asset resolution

## Transport and Header Rules

- Transport: `REST`
- Content type: `application/json`
- Auth header for protected endpoints: `Authorization: Bearer <accessToken>`
- Correlation headers:
  - request header: `X-Correlation-Id`
  - request header: `X-Request-Id`
  - response header: `x-correlation-id`
  - response header: `x-request-id`

Implementation note:

`asset-service` injects `x-request-id` and `x-correlation-id` automatically when absent, and echoes them back in the response headers.

## Response Envelope

Unlike `identity-service`, this service consistently uses a serialized success envelope for most endpoints:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id"
  }
}
```

Health also uses the same envelope in current implementation.

## Domain Enums Used By Current API

### `AssetType`

Used by asset search filters. Frontend should treat the allowed values as backend-owned enum values exposed through Swagger and backend typings.

### `MarkerTargetType`

Used for marker creation and remapping:

- backend-owned enum
- values should be consumed from generated types or Swagger when available

### Permission Codes Used On Current Routes

- `DASHBOARD_READ`
- `ASSETS_HEALTH_READ`
- `AR_ASSETS_IDENTIFY`
- `TOPOLOGY_STRUCTURE_MANAGE`
- `TOPOLOGY_NODES_MANAGE`
- `MARKERS_MANAGE`

## Shared Behavior

- Most endpoints are protected by `JwtAuthGuard` and `PermissionsGuard`
- Permission requirements are route-specific
- Success responses are wrapped in `{ data, meta }`
- Validation uses NestJS `ValidationPipe` with `whitelist`, `transform`, and `forbidNonWhitelisted`

## Endpoints

### `GET /api/v1/health`

- Auth: none
- Purpose: service health check

Example response:

```json
{
  "data": {
    "service": "asset-service",
    "status": "ok"
  },
  "meta": {}
}
```

### `GET /api/v1/topology/tree`

- Auth: bearer token required
- Required permission: `DASHBOARD_READ`
- Purpose: return the full rack and node topology tree

Response shape:

```json
{
  "data": {
    "items": []
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id"
  }
}
```

The exact nested topology structure is owned by `GetTopologyTreeUseCase`. Frontend should model this as a service-owned read model rather than infer persistence structure.

### `GET /api/v1/racks/:rackId/topology`

- Auth: bearer token required
- Required permission: `DASHBOARD_READ`
- Purpose: fetch topology details for one rack

Path params:

- `rackId`: rack identifier

Response shape:

Envelope-wrapped rack topology read model for the requested rack.

### `GET /api/v1/nodes/:nodeId/context`

- Auth: bearer token required
- Required permission: `ASSETS_HEALTH_READ`
- Purpose: get node context without embedded workload truth

Path params:

- `nodeId`: node identifier

Response shape:

Envelope-wrapped node context read model for operational and AR lookup use cases.

### `GET /api/v1/assets/by-code/:code`

- Auth: bearer token required
- Required permission: `ASSETS_HEALTH_READ`
- Purpose: find an asset summary by business code

Path params:

- `code`: asset business code

Response shape:

Envelope-wrapped asset summary.

### `GET /api/v1/markers/resolve/:markerCode`

- Auth: bearer token required
- Required permission: `AR_ASSETS_IDENTIFY`
- Purpose: resolve a marker into asset context only

Path params:

- `markerCode`: marker business code

Representative response:

```json
{
  "data": {
    "markerCode": "MK-RACK-A1",
    "targetType": "RACK",
    "targetId": "rack-a1"
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id"
  }
}
```

Frontend note:

This endpoint is a context lookup. It should not be treated as direct monitoring truth or workload truth.

### `GET /api/v1/assets/search`

- Auth: bearer token required
- Required permission: `DASHBOARD_READ`
- Purpose: search racks, nodes, and markers

Query params:

- `q`: optional free-text query string
- `type`: optional `AssetType`

Example query:

```text
/api/v1/assets/search?q=rack-a1&type=RACK
```

Representative response:

```json
{
  "data": {
    "items": []
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id"
  }
}
```

## Admin Topology Commands

All routes below:

- require bearer auth
- use `JwtAuthGuard` and `PermissionsGuard`
- return `{ data, meta }`

### `POST /api/v1/admin/topology/racks`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: create a new rack in `CREATED` state

Request body:

```json
{
  "rackCode": "RACK-A1",
  "displayName": "Rack A1",
  "siteCode": "DC-HCM",
  "roomCode": "ROOM-01",
  "zoneCode": "ZONE-A",
  "rowCode": "ROW-01",
  "positionCode": "P01",
  "capacityLimit": 42,
  "vendor": "APC",
  "notes": "Primary compute rack",
  "metadata": {
    "tier": "gold"
  }
}
```

Required fields:

- `rackCode`
- `displayName`

Optional fields:

- `siteCode`
- `roomCode`
- `zoneCode`
- `rowCode`
- `positionCode`
- `capacityLimit`
- `vendor`
- `notes`
- `metadata`

### `PATCH /api/v1/admin/topology/racks/:rackId`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: update editable rack fields

Path params:

- `rackId`: rack identifier

Request body:

Any subset of:

```json
{
  "rackCode": "RACK-A1",
  "displayName": "Rack A1 Updated",
  "capacityState": "AVAILABLE",
  "siteCode": "DC-HCM",
  "roomCode": "ROOM-01",
  "zoneCode": "ZONE-A",
  "rowCode": "ROW-01",
  "positionCode": "P01",
  "capacityLimit": 42,
  "vendor": "APC",
  "notes": "Updated notes",
  "metadata": {
    "tier": "gold"
  }
}
```

### `POST /api/v1/admin/topology/racks/:rackId/confirm-ready`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: transition rack preparation into `READY`
- Request body: none

### `POST /api/v1/admin/topology/racks/:rackId/activate`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: activate a rack for operations
- Request body: none

### `POST /api/v1/admin/topology/racks/:rackId/drain`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: move rack into draining state
- Request body: none

### `POST /api/v1/admin/topology/racks/:rackId/retire`

- Required permission: `TOPOLOGY_STRUCTURE_MANAGE`
- Purpose: retire an emptied rack
- Request body: none

### `POST /api/v1/admin/topology/nodes/normalize`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: normalize discovered node data into an asset record

Request body:

```json
{
  "nodeCode": "NODE-01",
  "displayName": "Compute Node 01",
  "source": "discovery-agent",
  "hostname": "compute-01",
  "nodeType": "compute",
  "serialNumber": "SN-001",
  "vendor": "Dell",
  "model": "R760",
  "managementIp": "10.0.0.10",
  "notes": "Imported from discovery",
  "metadata": {
    "cpuSockets": 2
  }
}
```

Required fields:

- `nodeCode`
- `displayName`
- `source`

Contract note:

- `source` is the canonical discovery source for the node record, not the intermediate service name.
- It should be forwarded from the upstream discovered-node record, for example `windows_exporter`, `docker`, or `lhm`.
- `vendor` and `model` are optional but should be preserved when they are available from discovery.

### `PATCH /api/v1/admin/topology/nodes/:nodeId`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: update editable node fields

Path params:

- `nodeId`: node identifier

Request body:

Any subset of:

```json
{
  "nodeCode": "NODE-01",
  "displayName": "Compute Node 01",
  "source": "manual",
  "hostname": "compute-01",
  "nodeType": "compute",
  "serialNumber": "SN-001",
  "vendor": "Dell",
  "model": "R760",
  "managementIp": "10.0.0.10",
  "notes": "Updated",
  "metadata": {
    "cpuSockets": 2
  }
}
```

Update note:

- `source` remains the canonical discovery source.
- `vendor` and `model` should be patched independently and must not be overwritten by service-name defaults.

### `POST /api/v1/admin/topology/nodes/:nodeId/assign-rack`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: assign or move a node into a rack

Path params:

- `nodeId`: node identifier

Request body:

```json
{
  "rackId": "rack-a1",
  "allowDraining": false
}
```

Required fields:

- `rackId`

### `POST /api/v1/admin/topology/nodes/:nodeId/activate`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: activate a placed node
- Request body: none

### `POST /api/v1/admin/topology/nodes/:nodeId/drain`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: move node into draining state
- Request body: none

### `POST /api/v1/admin/topology/nodes/:nodeId/retire`

- Required permission: `TOPOLOGY_NODES_MANAGE`
- Purpose: retire node and release rack assignment
- Request body: none

## Admin Marker Commands

All routes below:

- require bearer auth
- require permission `MARKERS_MANAGE`
- return `{ data, meta }`

### `POST /api/v1/admin/markers`

- Purpose: create a marker in `DRAFT` state

Request body:

```json
{
  "markerCode": "MK-RACK-A1",
  "displayLabel": "Rack A1 Marker",
  "targetType": "RACK",
  "targetId": "rack-a1",
  "imageTargetId": "img-target-001",
  "worldTrackingEnabled": true,
  "notes": "Mounted on front door",
  "metadata": {
    "printSize": "A6"
  }
}
```

Required fields:

- `markerCode`

### `PATCH /api/v1/admin/markers/:markerId`

- Purpose: update editable marker fields

Path params:

- `markerId`: marker identifier

Request body:

```json
{
  "markerCode": "MK-RACK-A1",
  "displayLabel": "Rack A1 Marker",
  "imageTargetId": "img-target-001",
  "worldTrackingEnabled": true,
  "notes": "Updated note",
  "metadata": {
    "printSize": "A6"
  }
}
```

### `POST /api/v1/admin/markers/:markerId/generate`

- Purpose: generate marker artifact
- Request body: none

### `POST /api/v1/admin/markers/:markerId/print`

- Purpose: move marker into printed workflow step
- Request body: none

### `POST /api/v1/admin/markers/:markerId/mount`

- Purpose: mark marker as mounted
- Request body: none

### `POST /api/v1/admin/markers/:markerId/validate`

- Purpose: validate marker after mounting
- Request body: none

### `POST /api/v1/admin/markers/:markerId/activate`

- Purpose: activate marker for operational usage
- Request body: none

### `POST /api/v1/admin/markers/:markerId/remap`

- Purpose: move marker to a different target entity

Request body:

```json
{
  "targetType": "RACK",
  "targetId": "rack-a2"
}
```

Required fields:

- `targetType`
- `targetId`

### `POST /api/v1/admin/markers/:markerId/retire`

- Purpose: retire marker from active use
- Request body: none

## Internal Compatibility Endpoint

### `POST /api/v1/internal/inventory/sync`

- Auth: bearer token required
- Guards: `JwtAuthGuard`, `PermissionsGuard`
- Current permission check: none declared at controller level
- Purpose: deprecated compatibility endpoint

Current response:

```json
{
  "data": {
    "deprecated": true,
    "message": "Inventory sync no longer mutates asset truth in asset-service. Use monitoring or workload ownership flows instead."
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id"
  }
}
```

Frontend note:

Do not build new product flows on top of this endpoint.

## Error Contract

This service is closest to the preferred repository-wide contract shape. Frontend should normalize failed calls using the standard error form from [CONTRACTS.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/CONTRACTS.md):

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": {}
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id",
    "version": "v1",
    "timestamp": "2026-06-11T10:00:00.000Z"
  }
}
```

Likely error categories:

- DTO validation failure
- permission denied
- authentication required
- resource not found
- invalid lifecycle transition
- duplicate code or marker conflicts

## Frontend Notes

- Prefer typed handling around the `{ data, meta }` envelope.
- Always preserve `x-request-id` and `x-correlation-id` when logging frontend errors for support workflows.
- Treat topology and marker responses as bounded-context read models, not shared persistence models.
