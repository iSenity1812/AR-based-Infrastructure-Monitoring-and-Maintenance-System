# Asset Context Schema

## 1. Muc dich

Tai lieu nay chot schema cho `Asset Context Service` o phase hien tai.
Schema nay duoc thiet ke de tra loi nhat quan 5 cau hoi nghiep vu:

1. Co cai gi?
2. O dau?
3. Dang chay gi?
4. Co song khong?
5. Nhin thay no o AR khong?

Muc tieu cua schema:

- giu `Asset Context Service` dung boundary `topology + marker mapping`
- khong bien service nay thanh noi so huu `telemetry`, `alert`, `incident`, `ticket`
- du metadata de dashboard, BFF, ingestion va WebAR dung chung mot mo hinh asset

## 2. Scope schema

Schema phase nay gom 3 collection co authoritatve ownership trong `asset_context_db`:

- `racks`
- `nodes`
- `markers`

Ngoai ra co 1 read model duoc khuyen nghi de query nhanh health o muc asset:

- `node_runtime_snapshots`

Read model la `derived state`.
No khong thay the telemetry raw va khong la source of truth cho topology.

Workload runtime schema duoc tach sang tai lieu tham chieu rieng:

- `workload-runtime-reference.md`

## 3. Modeling principles

- `rack` va `node` la asset topology chinh cua MVP.
- workload runtime nhu `container` va `service state` khong nam trong authoritative asset boundary.
- `vendor` nen co o `rack` va `node`.
- lifecycle state phai tach khoi health/runtime state.
- AR binding phai tach khoi telemetry va workflow state.

## 4. Cac capability can phuc vu

| Capability | Cau hoi nghiep vu | Du lieu can co |
| --- | --- | --- |
| Inventory identity | Co cai gi? | ma asset, ten hien thi, loai, vendor, model, serial, owner, tags |
| Physical placement | O dau? | rack mapping, room/zone, rack position, topology path |
| Composed workload context | Dang chay gi? | context nay duoc compose tu monitoring/workload boundary |
| Liveness context | Co song khong? | heartbeat, health status, health score, observed status |
| AR readiness | Nhin thay o AR khong? | marker binding, scan state, overlay preset, visibility flag |

## 5. Collection design

### 5.1 `racks`

`racks` luu asset topology cap cao nhat trong phase nay.

#### Purpose

- anchor topology cho dashboard va asset tree
- chua node
- cung cap physical context cho AR va monitoring

#### Required fields

| Field | Type | Why |
| --- | --- | --- |
| `_id` | ObjectId/UUID | primary key |
| `rackCode` | string | business id unique |
| `displayName` | string | ten hien thi cho dashboard/AR |
| `lifecycleState` | enum | trang thai vong doi asset |
| `capacityState` | enum | context suc chua logic |
| `siteCode*` | string | biet rack thuoc site nao |
| `roomCode*` | string | biet rack nam o phong nao |
| `zoneCode*` | string | phan vung trong phong/lab |
| `createdAt` | datetime | audit |
| `updatedAt` | datetime | audit |

#### Recommended fields

| Field | Type | Why |
| --- | --- | --- |
| `description` | string | mo ta nghiep vu |
| `vendor` | string | metadata asset thuc te |
| `model` | string | metadata asset thuc te |
| `assetTag` | string | ma kiem ke/noi bo |
| `serialNumber` | string | metadata procurement |
| `ownerTeam*` | string | ai so huu asset |
| `maintainerTeam` | string | ai van hanh/bao tri |
| `criticality` | enum | muc do quan trong |
| `capacityU` | number | tong suc chua logic theo U |
| `usedU` | number | suc chua da dung |
| `maxNodeCount*` | number | gioi han logic cua rack |
| `currentNodeCount*` | number | tong node hien tai |
| `layout**` | object | vi tri hien thi tren dashboard floor map |
| `installedAt` | datetime | ngay dua vao su dung |
| `commissionedAt` | datetime | ngay active |
| `retiredAt` | datetime/null | ngay retire |
| `tags` | string[] | loc/tim kiem |
| `schemaVersion` | int | migration support |

#### Lifecycle

`lifecycleState`:

- `CREATED`
- `READY`
- `ACTIVE`
- `DRAINING`
- `RETIRED`

`capacityState`:

- `AVAILABLE`
- `EXPANDING`
- `FULL`

### 5.2 `nodes`

`nodes` la asset trung tam de map telemetry, alert context va AR context.

#### Purpose

- dai dien host/server/logical machine
- duoc gan vao mot rack
- la diem neo cho telemetry enrichment va workload composition

#### Required fields

| Field | Type | Why |
| --- | --- | --- |
| `_id` | ObjectId/UUID | primary key |
| `nodeCode` | string | business id unique |
| `displayName` | string | ten hien thi |
| `rackId` | ObjectId/UUID | placement bat buoc |
| `hostname` | string | dinh danh runtime/OS |
| `nodeType` | enum | phan loai asset |
| `source` | enum | manual/discovered/simulated |
| `lifecycleState` | enum | trang thai vong doi |
| `assignmentState` | enum | context duoc gan vao rack hay chua |
| `createdAt` | datetime | audit |
| `updatedAt` | datetime | audit |

#### Recommended fields

| Field | Type | Why |
| --- | --- | --- |
| `description` | string | mo ta nghiep vu |
| `vendor` | string | metadata asset |
| `model` | string | metadata asset |
| `serialNumber` | string | metadata procurement |
| `assetTag` | string | kiem ke noi bo |
| `ownerTeam` | string | doi so huu |
| `maintainerTeam` | string | doi van hanh |
| `criticality` | enum | uu tien xu ly |
| `primaryIp` | string | lookup nhanh |
| `secondaryIps` | string[] | bo sung context |
| `osName` | string | context host |
| `osVersion` | string | context host |
| `agentVersion` | string | collector compatibility |
| `rackPosition` | string | vi tri trong rack |
| `rackUnitStart*` | number | placement theo U |
| `rackUnitSize*` | number | footprint logic |
| `cpuModel` | string | metadata asset |
| `cpuCores` | number | inventory/coarse capacity |
| `memoryTotalMb` | number | inventory/coarse capacity |
| `storageTotalGb` | number | inventory/coarse capacity |
| `interfaces*` | object[] | inventory co ban, khong day network modeling qua sau |
| `labels` | object | metadata linh hoat |
| `tags` | string[] | filter/query |
| `registeredAt` | datetime | admin tao record |
| `discoveredAt` | datetime | collector discover |
| `installedAt` | datetime | physical/logical install time |
| `commissionedAt` | datetime | bat dau active |
| `warrantyUntil` | datetime | asset management context |
| `retiredAt` | datetime/null | lifecycle close |
| `schemaVersion` | int | migration support |

#### Lifecycle

`lifecycleState`:

- `REGISTERED / DISCOVERED`
- `READY`
- `ACTIVE`
- `DRAINING`
- `RETIRED`

`assignmentState`:

- `UNASSIGNED`
- `ASSIGNED`
- `MOVED`

#### Runtime-facing fields on node

Luu y ve `source`:

- `source` o node la canonical discovery source, khong phai ten service trung gian.
- Vi du: `windows_exporter`, `docker`, `lhm`, hoac `manual` neu asset duoc tao thu cong.

Nhung field nay co the dat tren collection `nodes` neu can query don gian,
nhung ve kien truc van nen duoc cap nhat tu read model/snapshot:

- `heartbeatAt`
- `heartbeatStatus`
- `observedStatus`
- `healthStatus`
- `healthScore`
- `lastMetricAt`
- `lastBootAt`
- `lastRecoveryAt`
- `openAlertCount`

### 5.3 `markers`

`markers` la binding giua QR marker va asset target cho WebAR.

#### Purpose

- resolve marker thanh asset context
- cho biet asset co the hien thi trong AR hay khong
- luu lich su binding va scan metadata o muc nhe

#### Required fields

| Field | Type | Why |
| --- | --- | --- |
| `_id` | ObjectId/UUID | primary key |
| `markerCode` | string | QR code unique |
| `markerType` | enum | `QR` o phase nay |
| `targetType` | enum | `RACK` hoac `NODE` |
| `targetId` | ObjectId/UUID | asset dich |
| `bindingStatus` | enum | marker co bind hop le khong |
| `isActive` | boolean | co cho resolve khong |
| `isVisibleInAr` | boolean | co hien trong luong AR khong |
| `createdAt` | datetime | audit |
| `updatedAt` | datetime | audit |

#### Recommended fields

| Field | Type | Why |
| --- | --- | --- |
| `displayLabel` | string | hien thi trong AR/admin |
| `boundAt` | datetime | audit binding |
| `boundByUserId` | ObjectId/UUID | audit binding |
| `lastScannedAt` | datetime | AR usage |
| `scanCount` | number | AR usage |
| `lastResolvedAt` | datetime | tracking diagnostics |
| `overlayPreset` | string | chon profile overlay |
| `spatialHint` | object | offset/rotation hint |
| `targetSnapshot` | object | denormalized context nhe |
| `schemaVersion` | int | migration support |

#### Binding status

- `UNBOUND`
- `BOUND`
- `REMAPPED`
- `RETIRED`

## 6. Read models

### 6.1 `node_runtime_snapshots`

Collection nay giup tra loi nhanh "co song khong" ma khong phai quet raw telemetry.

#### Suggested fields

- `_id`
- `nodeId`
- `heartbeatAt`
- `heartbeatStatus`
- `observedStatus`
- `healthStatus`
- `healthScore`
- `cpuUsagePct`
- `memoryUsedPct`
- `diskUsedPct`
- `networkTotalBytesSec`
- `lastMetricAt`
- `openAlertCount`
- `activeIncidentCount`
- `updatedAt`

#### Suggested enums

`heartbeatStatus`:

- `ONLINE`
- `STALE`
- `OFFLINE`

`observedStatus`:

- `NORMAL`
- `DEGRADED`
- `MAINTENANCE`
- `OFFLINE`
- `RECOVERING`

## 7. Enum catalog

### 7.1 Shared enums

`criticality`:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

`source`:

- `MANUAL`
- `DISCOVERED`
- `SIMULATED`

### 7.2 Node types

- `COMPUTE`
- `STORAGE`
- `MOCK_SERVICE_HOST`
- `COLLECTOR_HOST`
- `DATABASE_HOST`

### 7.3 Marker types

- `QR`

## 8. Mapping 5 cau hoi sang collection

| Cau hoi | Collection/field chinh |
| --- | --- |
| Co cai gi? | `racks.displayName`, `nodes.displayName`, `nodes.vendor`, `nodes.model` |
| O dau? | `nodes.rackId`, `nodes.rackPosition`, `racks.siteCode`, `racks.roomCode`, `racks.zoneCode` |
| Dang chay gi? | BFF compose tu monitoring/workload service dua tren `nodeId` |
| Co song khong? | `node_runtime_snapshots.heartbeatStatus`, `node_runtime_snapshots.healthScore` |
| Nhin thay o AR khong? | `markers.bindingStatus`, `markers.isVisibleInAr`, `markers.overlayPreset`, `markers.targetId` |

## 9. Index suggestions

### 9.1 `racks`

- unique: `rackCode`
- index: `siteCode, roomCode, zoneCode`
- index: `lifecycleState, capacityState`

### 9.2 `nodes`

- unique: `nodeCode`
- index: `rackId, lifecycleState`
- index: `hostname`
- index: `primaryIp`
- index: `vendor, model`
- index: `ownerTeam, criticality`

### 9.3 `markers`

- unique: `markerCode`
- index: `targetType, targetId`
- index: `bindingStatus, isActive`
- index: `lastScannedAt`

### 9.4 Read models

- `node_runtime_snapshots`: unique `nodeId`

## 10. Ownership boundary

`Asset Context Service` so huu:

- topology identity
- placement
- marker binding

Service nay khong so huu:

- workload inventory truth
- workload runtime snapshot
- telemetry raw
- service logs raw
- alert lifecycle
- incident workflow
- ticket workflow
- ticket operations nhu `assign`, `acknowledge`, `in-progress`, `escalate`, `resolve`, `cancel`
- AR session/inspection workflow

`node_runtime_snapshots` duoc phep ton tai trong boundary nay vi no la derived read model phuc vu query nhanh context asset.

## 11. MVP vs later

### MVP must-have

- `racks`: identity, placement, lifecycle, capacity state
- `nodes`: identity, placement, vendor/model, lifecycle, assignment, basic inventory
- `markers`: binding status, visibility, overlay preset
- `node_runtime_snapshots`

### Later

- maintenance history chi tiet tren asset
- richer compliance/inventory audit
- linh kien/phu tung cua node
- procurement financial data sau hon
- topology link phuc tap hon neu can

## 12. Chot huong implement

Neu can uu tien theo phase backend:

1. Dinh nghia DTO va schema cho `racks`, `nodes`, `markers`
2. Them lifecycle enums va validation rules
3. Tao read model `node_runtime_snapshots`
4. Them query API tra loi truc tiep 5 cau hoi nghiep vu
5. Query "dang chay gi" duoc compose tu monitoring/workload boundary
6. Sau do moi toi uu cache va event propagation
