# Spec: Monitoring Service Node Overview Snapshot and Realtime

## Assumptions I'm Making
1. Scope hien tai chi gom `node overview snapshot` va `realtime websocket overview`, khong bao gom `insight` hay `trend API`.
2. `Monitoring Service` la owner cua monitoring-facing read model va realtime event cho overview nay.
3. Nguon du lieu snapshot chinh la ClickHouse serving views da co san, chu yeu la `telemetry_db.node_current_summary` va `telemetry_db.container_current_summary`.
4. Operator mo node overview tu dashboard/web client va can payload nho, response nhanh, uu tien "what is happening now".
5. UI co the goi REST de hydrate lan dau va giu websocket subscription trong thoi gian panel node dang mo.
6. Contract public khong nen lo thang `severity_code` noi bo cua ClickHouse; backend se map sang enum on dinh hon cho client.

## Objective
Xay dung contract va implementation direction cho `Node Overview` trong `Monitoring Service` de operator co the bam vao mot node va nhin thay tinh trang hien tai cua node ngay lap tuc, kem mot danh sach workload duoc rut gon va du lieu realtime de panel dang mo luon duoc cap nhat.

Muc tieu nghiep vu:
- Tra loi nhanh cau hoi "Node nay hien tai co dang co van de khong?"
- Cho operator thay nhung metric tong quan can thiet nhat de quyet dinh co can dao sau hay khong.
- Hien thi workload list o muc overview theo huong "abnormal first", khong flood UI bang full 50-100 workloads.
- Dong bo panel overview theo realtime khi snapshot thay doi.

Thanh cong duoc dinh nghia la:
- Operator click node thi nhan duoc snapshot overview nhanh va gon.
- Khi node thay doi health/snapshot, UI overview dang mo duoc cap nhat qua websocket ma khong can refresh lai trang.
- Contract du ro rang de co the implement theo giai doan ma khong phai brainstorm lai.

## Tech Stack
- NestJS 11
- TypeScript 5
- Socket.IO qua `@nestjs/websockets` va `@nestjs/platform-socket.io`
- ClickHouse qua `@clickhouse/client`
- Monitoring service hien co theo kieu clean-ish layered architecture:
  - inbound adapters
  - application ports/services/mappers
  - infrastructure adapters

## Commands
Lenh duoc xac nhan tu `backend/apps/control-plane/monitoring-service/package.json`:

```powershell
Build: pnpm -C backend/apps/control-plane/monitoring-service build
Dev: pnpm -C backend/apps/control-plane/monitoring-service dev
Start (watch): pnpm -C backend/apps/control-plane/monitoring-service start:dev
Lint: pnpm -C backend/apps/control-plane/monitoring-service lint
Test: pnpm -C backend/apps/control-plane/monitoring-service test
Coverage: pnpm -C backend/apps/control-plane/monitoring-service test:cov
E2E: pnpm -C backend/apps/control-plane/monitoring-service test:e2e
```

Commands ho tro verify du lieu ClickHouse local:

```powershell
Docker status: docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
ClickHouse ping:
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8123/?query=SELECT%201" -Headers @{ "X-ClickHouse-User"="root"; "X-ClickHouse-Key"="password" }
```

## Project Structure
Nhung khu vuc implementation du kien se lien quan:

```text
backend/apps/control-plane/monitoring-service/
  src/
    adapters/
      inbound/
        http/           -> REST controllers, DTOs, serializers, guards
        websocket/      -> Socket.IO gateway, subscriptions, outbound events
      outbound/
        clickhouse/     -> Query adapters/doc noi bo tuy theo cau truc hien co
    application/
      ports/            -> Query/realtime abstractions
      services/         -> Overview composition/use case
      mappers/          -> REST and realtime response mapping
      policies/         -> Realtime emission / ranking policy
    domain/
      monitoring/       -> Shared monitoring concepts, scope state, severity
    infrastructure/
      persistence/      -> ClickHouse client / repository implementation neu co

docs/superpowers/specs/
  2026-07-10-node-overview-realtime-spec.md -> Spec nay
```

Source docs/reference:

```text
docs/api-contracts/control-plane/monitoring-service.md
docs/superpowers/specs/2026-07-08-rack-monitoring-socketio-realtime-design.md
backend/apps/clickhouse-init/04_node_serving/08_node_current_summary.sql
backend/apps/clickhouse-init/04_node_serving/09_node_summary_trend_1m.sql
backend/apps/clickhouse-init/07_container_service_serving/03_container_current_summary.sql
```

## Code Style
Spec nay follow style hien co cua service:
- Public API phai ro nghia nghiep vu, khong leak raw internal codes neu client khong can.
- DTO naming theo huong `NodeOverviewResponseDto`, `NodeOverviewRealtimeEventDto`.
- Query composition nam o application layer, khong day len websocket gateway hay controller.
- Reuse mapper pattern thay vi build object inline lung tung.

Style huong dan bang vi du:

```ts
export type NodeOverviewStatus = 'healthy' | 'alerting' | 'unknown';
export type NodeOverviewSeverity = 'none' | 'low' | 'medium' | 'high' | 'unknown';

export interface NodeOverviewSnapshot {
  node: {
    nodeId: string;
    status: NodeOverviewStatus;
    severity: NodeOverviewSeverity;
    lastSeenAt: string;
    freshnessSec: number;
  };
  summaryMetrics: {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    diskUsagePct: number | null;
    cpuTemperatureC: number | null;
    networkRxBytesSec: number | null;
    networkTxBytesSec: number | null;
    primaryNicStatus: string | null;
    worstMetric: {
      metricKey: string | null;
      metricValueNumeric: number | null;
      metricValueText: string | null;
    };
    alertCounters: {
      criticalMetricCount: number;
      warningMetricCount: number;
      staleMetricCount: number;
    };
  };
}
```

## Testing Strategy
- Unit tests cho:
  - status/severity derivation
  - workload ranking and limiting
  - overview response mapper
  - realtime emission policy
- Integration tests cho:
  - `GET /api/v1/monitoring/nodes/:nodeId/overview`
  - query adapter / repository mapping tu ClickHouse rows sang response model
- Manual verification cho:
  - Click node -> REST snapshot dung shape
  - Panel dang mo -> nhan WS event overview update
  - Node co nhieu workloads -> response chi tra condensed list

Test levels:
- Unit: pure mappers, derivation, selection logic
- Integration: service + controller + adapter wiring
- Manual: ClickHouse sample data va websocket flow

## Boundaries
- Always:
  - Giu `overview` la snapshot-first.
  - Giu payload nho va operator-first.
  - REST va WS dung mot response shape nhat quan toi da.
  - Dung `node_current_summary` va `container_current_summary` lam source chinh cho phase nay.
  - Giu `insight` va `trend` ngoai scope implementation hien tai.
- Ask first:
  - Them dependency moi.
  - Sua/extend ClickHouse schema serving views.
  - Doi enum public contract sau khi da chot spec nay.
  - Day them physical metadata tu service khac vao overview phase nay.
- Never:
  - Dump full workload list vao overview.
  - Leaking raw internal severity code truc tiep cho frontend.
  - Tron `insight` logic vao `overview` cho nhanh.
  - Tao query-only microservice moi cho overview.

## Functional Scope

### In Scope
1. REST snapshot:
   - `GET /api/v1/monitoring/nodes/:nodeId/overview`
2. Realtime websocket:
   - namespace `/monitoring`
   - event `monitoring.node.overview.updated`
3. Backend composition:
   - node snapshot
   - summary metrics
   - workload summary
   - condensed workloads
4. Public status/severity derivation for overview
5. Realtime payload contract for open panel synchronization

### Out of Scope
1. `GET /api/v1/monitoring/nodes/:nodeId/insight`
2. `node_summary_trend_1m`-based trend API
3. Root-cause analysis
4. Recommendation/insight generation
5. Full workload pagination/list endpoint

## Data Sources

### Primary Node Snapshot Source
`telemetry_db.node_current_summary`

Expected relevant fields:
- `node_id`
- `summary_ts`
- `max_severity_code`
- `has_override_flag`
- `is_any_stale`
- `stale_metric_count`
- `critical_metric_count`
- `warning_metric_count`
- `cpu_usage_pct_current`
- `memory_used_pct_current`
- `cpu_temperature_c_current`
- `disk_used_pct_max_current`
- `network_rx_bytes_sec_sum_current`
- `network_tx_bytes_sec_sum_current`
- `primary_nic_status_current`
- `worst_metric_key`
- `worst_metric_numeric_value`
- `worst_metric_text_value`

### Primary Workload Source
`telemetry_db.container_current_summary`

Expected relevant fields:
- `container_id`
- `container_name`
- `service_name`
- `node_id`
- `container_state`
- `container_health_status`
- `max_severity_code`
- `has_override_flag`
- `is_any_stale`
- `cpu_usage_pct_current`
- `memory_used_pct_current`
- `restart_count_current`
- `pid_count_current`
- `container_status_current`
- `worst_metric_key`

### Explicitly Deferred Source
`telemetry_db.node_summary_trend_1m`

Ly do defer:
- Hop cho trend va insight.
- Khong phai source tot nhat cho freshness/current truth.
- Se duoc su dung o phase `insight`.

## Public API Contract

### REST Endpoint
```http
GET /api/v1/monitoring/nodes/:nodeId/overview
```

### Success Response
```json
{
  "node": {
    "nodeId": "node-msi-5e8ff2c0",
    "status": "alerting",
    "severity": "high",
    "lastSeenAt": "2026-07-10T19:00:18Z",
    "freshnessSec": 3
  },
  "summaryMetrics": {
    "cpuUsagePct": 35.239,
    "memoryUsagePct": 85.107,
    "diskUsagePct": 85.731,
    "cpuTemperatureC": 92,
    "networkRxBytesSec": 247041.397,
    "networkTxBytesSec": 7752.464,
    "primaryNicStatus": "dormant",
    "worstMetric": {
      "metricKey": "node.tcp_retransmit_pct",
      "metricValueNumeric": 19.604,
      "metricValueText": "19.604"
    },
    "alertCounters": {
      "criticalMetricCount": 2,
      "warningMetricCount": 4,
      "staleMetricCount": 0
    }
  },
  "workloadSummary": {
    "total": 50,
    "unhealthy": 2,
    "nonRunning": 1,
    "highCpu": 3,
    "highMemory": 4,
    "returned": 5,
    "selectionMode": "abnormal_first_then_top_cpu"
  },
  "workloads": [
    {
      "workloadId": "db8559e332ec64dfa558917710d5afb621c0a7ea8b5f91193c5c288ba28d663d",
      "workloadType": "container",
      "name": "backend-shared-vector",
      "serviceName": "vector",
      "status": "running",
      "healthStatus": "unhealthy",
      "cpuUsagePct": 1.1,
      "memoryUsagePct": 0.62,
      "restartCount": 0,
      "pidCount": 17,
      "worstMetricKey": "container.runtime_id",
      "isAbnormal": true
    }
  ],
  "realtime": {
    "channel": "monitoring.node.overview.updated",
    "version": 1
  }
}
```

### Response Semantics

#### `node`
- `nodeId`: public node identifier
- `status`:
  - `healthy`
  - `alerting`
  - `unknown`
- `severity`:
  - `none`
  - `low`
  - `medium`
  - `high`
  - `unknown`
- `lastSeenAt`: latest snapshot timestamp in ISO 8601 UTC
- `freshnessSec`: seconds from `lastSeenAt` to now

#### `summaryMetrics`
Muc tieu la "operator-first", khong phai full metric dump.

Required fields:
- `cpuUsagePct`
- `memoryUsagePct`
- `diskUsagePct`
- `cpuTemperatureC`
- `networkRxBytesSec`
- `networkTxBytesSec`
- `primaryNicStatus`
- `worstMetric`
- `alertCounters`

Nullable metrics:
- value co the `null` neu current summary khong co du lieu cho metric do.

#### `workloadSummary`
Tom tat full workload population tren node, cho UI biet overview dang hien subset nao.

Required fields:
- `total`
- `unhealthy`
- `nonRunning`
- `highCpu`
- `highMemory`
- `returned`
- `selectionMode`

`selectionMode` v1:
- `abnormal_first_then_top_cpu`

#### `workloads`
Khong phai full list. Chi la condensed list co uu tien abnormal truoc.

Required fields:
- `workloadId`
- `workloadType`
- `name`
- `serviceName`
- `status`
- `healthStatus`
- `cpuUsagePct`
- `memoryUsagePct`
- `restartCount`
- `pidCount`
- `worstMetricKey`
- `isAbnormal`

`workloadType` v1:
- `container`

## WebSocket Contract

### Namespace
```text
/monitoring
```

### Event
```text
monitoring.node.overview.updated
```

### Event Purpose
- Dong bo panel node overview dang mo sau khi client da hydrate bang REST.
- Event nay phuc vu current snapshot sync, khong phuc vu trend playback.

### Event Payload
V1 dung near-full payload cung shape voi REST de frontend merge de dang.

```json
{
  "nodeId": "node-msi-5e8ff2c0",
  "emittedAt": "2026-07-10T19:01:02Z",
  "node": {
    "status": "alerting",
    "severity": "high",
    "lastSeenAt": "2026-07-10T19:01:00Z",
    "freshnessSec": 2
  },
  "summaryMetrics": {
    "cpuUsagePct": 39.882,
    "memoryUsagePct": 85.441,
    "diskUsagePct": 85.731,
    "cpuTemperatureC": 94,
    "networkRxBytesSec": 260120.221,
    "networkTxBytesSec": 8012.004,
    "primaryNicStatus": "dormant",
    "worstMetric": {
      "metricKey": "node.cpu_temperature_c",
      "metricValueNumeric": 94,
      "metricValueText": "94"
    },
    "alertCounters": {
      "criticalMetricCount": 3,
      "warningMetricCount": 4,
      "staleMetricCount": 0
    }
  },
  "workloadSummary": {
    "total": 50,
    "unhealthy": 2,
    "nonRunning": 1,
    "highCpu": 4,
    "highMemory": 4,
    "returned": 5,
    "selectionMode": "abnormal_first_then_top_cpu"
  },
  "workloads": []
}
```

## Derivation Rules

### Node Status and Severity
Public mapping khong expose thang internal severity code.

V1 proposed rules:

1. `status = unknown`, `severity = unknown` neu:
   - snapshot khong ton tai, hoac
   - `freshnessSec` vuot nguong stale toan node, hoac
   - `is_any_stale = 1` va `stale_metric_count` dat muc coi la stale nghiem trong

2. `status = alerting`, `severity = high` neu:
   - `criticalMetricCount > 0`

3. `status = alerting`, `severity = medium` neu:
   - `criticalMetricCount = 0`
   - `warningMetricCount > 0`

4. `status = healthy`, `severity = none` neu:
   - khong critical
   - khong warning
   - khong stale nghiem trong

Ghi chu:
- `has_override_flag` co the duoc dung trong logic internal ranking, nhung khong can expose raw cho client v1.
- exact stale threshold toan node can duoc codify trong implementation task, nhung contract public o spec nay da chot semantics.

### Workload Selection
`workloads` duoc chon theo rule:

1. Uu tien abnormal workloads:
   - `healthStatus = unhealthy`
   - `status != running`
   - `restartCount > 0`
2. Neu chua du slot:
   - fill theo `cpuUsagePct` giam dan
   - tiep theo `memoryUsagePct` giam dan
3. Gioi han:
   - `returned <= 5`

`isAbnormal = true` neu workload match bat ky abnormal rule nao.

### Workload Summary Counters
- `total`: tong so workload co `node_id = :nodeId`
- `unhealthy`: count `container_health_status = unhealthy`
- `nonRunning`: count `container_state != running`
- `highCpu`: count workload vuot nguong CPU policy v1
- `highMemory`: count workload vuot nguong memory policy v1
- `returned`: so item thuc su tra ve trong `workloads`

## Realtime Delivery Model

### Snapshot Lifecycle
1. Client click node
2. Client goi `GET /overview`
3. Client render snapshot
4. Client subscribe namespace `/monitoring`
5. Backend push `monitoring.node.overview.updated` khi snapshot thay doi

### Emission Intent
V1 event nen duoc phat khi:
- node overview snapshot thay doi nghia nghiep vu
- co thay doi `status` hoac `severity`
- co thay doi metric summary dang expose
- co thay doi workload condensed list hoac workload counters

### Emission Shape
V1 uu tien full-ish payload de:
- frontend de implement
- tranh merge logic phuc tap
- dong bo shape voi REST

Delta-only event la out of scope cho v1.

## Non-Functional Expectations
- REST overview phai toi uu cho click-to-open.
- Payload overview phai nho hon so voi full workload dump.
- WS event phai on dinh ve shape va versionable.
- Overview phai uu tien readability cho operator hon la do phong phu metric.

## Success Criteria
- [ ] Co spec file trong repo cho `node overview + realtime`.
- [ ] Contract REST va WS duoc chot ro rang, co example payload.
- [ ] Scope `overview` va `insight` duoc tach bach.
- [ ] Data sources cho node snapshot va workload brief duoc chot.
- [ ] Workload selection strategy duoc chot, khong co full workload dump.
- [ ] Status/severity semantics duoc chot o muc du cho implementation.
- [ ] Realtime model REST-first + WS-sync duoc chot.

## Open Questions
- Nguong cu the cho `highCpu` va `highMemory` trong `workloadSummary` se dung policy co san hay hardcode v1?
- Stale threshold toan node de map sang `unknown` nen dung theo metric stale ratio hay `lastSeenAt` gap duy nhat?
- Co can bo sung physical metadata nhu `positionU`, `primaryIpv4`, `hardwareSerial` vao `overview` phase nay hay de phase sau?
- Event subscription should be namespace-wide with client-side filtering, or support room-by-node for efficiency?
