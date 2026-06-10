# Workload Runtime Reference

## 1. Muc dich

Tai lieu nay giu lai phan schema workload runtime da duoc tach khoi `Asset Context Service`.
No khong phai authoritative schema cua `asset_context_db`.

Tai lieu nay ton tai de:

- tai su dung neu team can tao `Monitoring Service` read model hoac workload inventory boundary rieng
- giu lai phan model da phan tich truoc do cho `container` va workload runtime
- tranh mat cong phan tich neu phase sau can revive lai

## 2. Boundary note

`containers` va workload runtime state khong nen nam trong `Asset Context Service`.
No phu hop hon voi:

- `Telemetry Ingestion Service` cho ingest metadata/runtime events
- `Stream Processing Service` cho derived snapshots
- `Monitoring Service` cho read model va UI-facing query

## 3. Suggested collection: `containers`

`containers` la inventory cua workload runtime tren node.
No tra loi "dang chay gi" va mot phan "co song khong" o workload boundary.

### Required fields

| Field | Type | Why |
| --- | --- | --- |
| `_id` | ObjectId/UUID | primary key |
| `nodeId` | ObjectId/UUID | container thuoc node nao |
| `containerRuntimeId` | string | runtime identity unique |
| `containerName` | string | ten hien thi |
| `runtimeType` | enum | docker/process/windows-service neu can mo rong |
| `workloadName` | string | ten workload logic |
| `workloadType` | enum | API/WORKER/DB/COLLECTOR/UI/... |
| `runtimeStatus` | enum | trang thai runtime hien tai |
| `createdAt` | datetime | audit |
| `updatedAt` | datetime | audit |

### Recommended fields

| Field | Type | Why |
| --- | --- | --- |
| `displayName` | string | ten hien thi than thien |
| `imageName` | string | inventory |
| `imageTag` | string | version runtime |
| `imageDigest` | string | identity chinh xac |
| `version` | string | phuc vu diagnostics |
| `serviceName` | string/null | logical service label neu can giu |
| `desiredState` | enum | muc tieu runtime |
| `healthStatus` | enum | runtime health |
| `healthScore` | number | scoring/read model |
| `restartCount` | number | phat hien flapping |
| `restartPolicy` | string | context runtime |
| `exitCode` | number/null | diagnostics |
| `startedAt` | datetime | diagnostics |
| `finishedAt` | datetime/null | diagnostics |
| `lastSeenAt` | datetime | heartbeat inventory |
| `lastStateTransitionAt` | datetime | timeline |
| `lastRestartAt` | datetime | diagnostics |
| `ports` | object[] | port binding |
| `envProfile` | string | dev/demo/prod-sim |
| `dependencies` | string[] | workload context |
| `labels` | object | metadata linh hoat |
| `tags` | string[] | filter |
| `schemaVersion` | int | migration support |

### Runtime lifecycle

`runtimeStatus`:

- `PENDING`
- `RUNNING`
- `RESTARTING`
- `STOPPED`
- `FAILED`
- `REMOVED`

`desiredState`:

- `RUNNING`
- `STOPPED`

## 4. Suggested read model: `container_runtime_snapshots`

Collection nay giup query nhanh workload runtime trong node detail va AR overlay.

### Suggested fields

- `_id`
- `containerId`
- `nodeId`
- `runtimeStatus`
- `healthStatus`
- `healthScore`
- `cpuUsagePct`
- `memoryUsedMb`
- `networkBytesSec`
- `restartCount`
- `lastSeenAt`
- `exitCode`
- `isFlapping`
- `openAlertCount`
- `updatedAt`

## 5. Suggested enums

`workloadType`:

- `API`
- `WORKER`
- `DATABASE`
- `CACHE`
- `COLLECTOR`
- `SIMULATION`
- `UI`
- `OTHER`

## 6. Suggested indexes

### `containers`

- unique: `containerRuntimeId`
- index: `nodeId, runtimeStatus`
- index: `workloadName, workloadType`
- index: `serviceName`
- index: `lastSeenAt`

### `container_runtime_snapshots`

- unique: `containerId`
