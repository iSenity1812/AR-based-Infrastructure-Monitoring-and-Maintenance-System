# Workload Telemetry Design for PoC

## 1. Muc tieu tai lieu

Tai lieu nay chot huong thiet ke `workload telemetry` cho he thong PoC AR + AI monitoring va maintenance.

Muc tieu:

- Lam ro `workload` trong context cua de tai la gi.
- Tach ro `node telemetry` va `workload telemetry`.
- Xac dinh nguon du lieu cho workload trong moi truong Windows lab.
- Chot inventory, status, va metrics toi thieu cho workload.
- Ho tro dashboard, alerting, AR diagnostics, incident workflow, va AI analytics.

Tai lieu nay bo sung cho:

- `docs/telemetry/node_metrics_windows_exporter.md`
- `docs/system_requirements_v1_vn.md`
- `docs/data_pipeline_architecture.md`

## 2. Dinh nghia workload trong du an

Trong context cua de tai, `workload` la thanh phan chay tren `node` va mang y nghia van hanh.

Co the gom:

- `Docker container`
- `Windows service`
- `Windows process/app`
- `simulation workload` duoc tao co chu dich de phuc vu demo va test scenario

Workload khong phai la `node`.

- `node` = may tinh, laptop, VM, hoac host logic
- `workload` = app, service, container, process chay tren node

Trong PoC:

- neu co nhieu may, moi may nen duoc xem la `node`
- workload tren moi may co the la container, process, hoac simulation app
- simulation co the tao them workload va event gia lap, nhung khong thay the toan bo luong workload that

## 3. Vai tro cua workload telemetry

Workload telemetry phai phuc vu 5 muc dich:

1. Cho dashboard biet tren moi node dang chay workload nao.
2. Cho monitoring biet workload nao dang `running`, `stopped`, `degraded`, hoac `restarting`.
3. Cho AR diagnostics biet asset dang gap van de o workload nao de technician thao tac nhanh.
4. Cho alerting co them ngu canh khi alert phat sinh o cap service/process/container.
5. Cho AI analytics va predictive maintenance co them du lieu ve hanh vi workload.

## 4. Nguyen tac mo hinh workload telemetry

### 4.1. Tach 3 lop du lieu

Nen tach ro:

1. `Inventory metadata`
   - workload la gi
   - thuoc node nao
   - thuoc service logic nao

2. `Runtime status`
   - dang chay hay khong
   - co restart loop khong
   - co heartbeat khong

3. `Operational metrics`
   - CPU
   - memory
   - network I/O
   - restart count
   - response time neu co

### 4.2. Uu tien cho PoC

- Uu tien inventory va status truoc.
- Khong can lam full observability cho tung workload o phase dau.
- Neu chua lay duoc metric chi tiet, van nen lay duoc:
  - workload name
  - runtime type
  - node owner
  - running/stopped
  - last seen

### 4.3. Khong expose qua nhieu cho technician

Workload telemetry phai du cho maintenance, nhung khong duoc expose:

- secret
- token
- connection string
- environment variables nhay cam
- raw log nhay cam
- config noi bo khong can thiet

## 5. Nguon du lieu workload de xuat

Workload telemetry co the den tu 3 nhom nguon.

### 5.1. Docker runtime

Dung khi workload chay bang container.

Nguon du lieu:

- Docker Engine API
- `docker ps`
- `docker inspect`
- `docker stats`

Lay duoc:

- container id
- container name
- image
- status
- ports
- labels
- started time
- CPU
- memory
- network I/O
- restart count neu co

Docker la nguon uu tien neu team containerize app hoac can demo nhieu workload de nhin ro tren topology.

### 5.2. Windows services va process

Dung khi workload khong chay bang Docker.

Nguon du lieu:

- Windows Service Manager
- process discovery
- WMI hoac PowerShell
- custom process mapping config

Lay duoc:

- service/process name
- PID
- executable path
- status running/stopped
- start time
- CPU/memory theo process neu can

Huong nay phu hop cho:

- app Node.js chay local
- Python workers
- service he thong can monitor o muc PoC

### 5.3. Simulation workload

Dung de phuc vu demo va tao scenario co kiem soat.

Nguon du lieu:

- `Simulation Service`
- simulation script local
- custom generator publish metadata va fault events

Lay duoc:

- workload logic name
- status gia lap
- fault labels
- transition event
- maintenance outcome labels

Simulation khong nen la nguon workload duy nhat cho luong van hanh thong thuong.
No nen dong vai tro:

- tao du lieu de test rule
- tao alert va incident scenario
- tao label cho analytics va training

## 6. Mo hinh domain de xuat

Nen chia `workload` thanh 2 lop.

### 6.1. Workload Service

`WorkloadService` la service logic on dinh hon, vi du:

- `monitoring-api`
- `web-dashboard`
- `collector-agent`
- `simulation-engine`
- `redis-cache`

Thuoc tinh goi y:

- `serviceId`
- `serviceCode`
- `serviceName`
- `category`
- `ownerNodeId`
- `runtimeType`
- `criticality`
- `exposedPorts`
- `tags`

### 6.2. Workload Instance

`WorkloadInstance` la instance runtime cu the cua mot service.

Thuoc tinh goi y:

- `instanceId`
- `serviceId`
- `nodeId`
- `runtimeType`
- `runtimeRef`
- `name`
- `status`
- `startTime`
- `lastSeen`
- `restartCount`

Neu he thong chay chu yeu bang Docker, `runtimeRef` co the la `containerId`.
Neu chay bang process, `runtimeRef` co the la `pid` hoac `serviceName`.

## 7. Du lieu toi thieu can thu

### 7.1. Inventory metadata

Nen co toi thieu:

- `workload.service_name`
- `workload.instance_name`
- `workload.runtime_type`
- `workload.node_id`
- `workload.image_or_binary`
- `workload.port_bindings`
- `workload.version` neu lay duoc
- `workload.labels`

### 7.2. Runtime status

Nen co toi thieu:

- `workload.status`
- `workload.last_seen`
- `workload.start_time`
- `workload.restart_count`
- `workload.health_state` neu co

Trang thai goi y:

- `running`
- `stopped`
- `degraded`
- `restarting`
- `unknown`

### 7.3. Operational metrics

Nen co toi thieu:

- `workload.cpu_usage_pct`
- `workload.memory_used_mb`
- `workload.network_rx_bytes_sec`
- `workload.network_tx_bytes_sec`

Co the bo sung phase sau:

- `workload.disk_io_bytes_sec`
- `workload.error_rate`
- `workload.response_time_ms`
- `workload.heartbeat_delay_ms`

## 8. Metric catalog toi thieu cho workload

| Metric Key                    | Display Name        | Category  | Type     | Unit      | Source                          | Purpose                                    | AR  | AI      | Alert   |
| ----------------------------- | ------------------- | --------- | -------- | --------- | ------------------------------- | ------------------------------------------ | --- | ------- | ------- |
| `workload.service_name`       | Service Name        | identity  | observed | text      | Docker/process/simulation       | Hien thi workload ngu nghia nghiep vu      | yes | no      | no      |
| `workload.instance_name`      | Instance Name       | identity  | observed | text      | Docker/process/simulation       | Phan biet instance runtime                 | yes | no      | no      |
| `workload.runtime_type`       | Runtime Type        | inventory | observed | text      | Docker/process/simulation       | Biet workload dang chay bang gi            | no  | no      | no      |
| `workload.node_id`            | Node Owner          | inventory | observed | text      | Collector mapping               | Map workload vao node                      | yes | partial | no      |
| `workload.status`             | Workload Status     | status    | observed | state     | Docker/process/simulation       | Xac dinh tinh trang van hanh               | yes | yes     | yes     |
| `workload.last_seen`          | Last Seen           | status    | observed | timestamp | Collector                       | Biet workload con duoc quan sat hay khong  | yes | partial | yes     |
| `workload.restart_count`      | Restart Count       | status    | observed | count     | Docker/process/simulation       | Phat hien instability                      | yes | yes     | yes     |
| `workload.cpu_usage_pct`      | CPU Usage           | compute   | observed | %         | Docker stats/process metrics    | Monitoring va anomaly signal               | yes | yes     | yes     |
| `workload.memory_used_mb`     | Memory Usage        | memory    | observed | MB        | Docker stats/process metrics    | Monitoring va anomaly signal               | yes | yes     | yes     |
| `workload.network_rx_bytes_sec` | Network RX        | network   | observed | bytes/sec | Docker stats neu co             | Hieu traffic vao workload                  | no  | yes     | partial |
| `workload.network_tx_bytes_sec` | Network TX        | network   | observed | bytes/sec | Docker stats neu co             | Hieu traffic ra workload                   | no  | yes     | partial |
| `workload.health_score`       | Workload Health     | scoring   | derived  | score     | Tong hop status va metric       | Hien thi overlay va triage                 | yes | yes     | yes     |
| `workload.risk_score`         | Workload Risk       | scoring   | derived  | score     | Tong hop trend, restart, alert  | Uu tien maintenance                        | yes | yes     | yes     |

## 9. Luong collector de xuat

Workload telemetry nen di theo huong `node-local discovery` roi moi day len backend.

### 9.1. Luong tong quat

1. `Windows Exporter` cung cap `node metrics`.
2. `Workload discovery adapter` doc Docker, Windows services, process list, hoac simulation runtime.
3. `Collector aggregator` gom `node telemetry` va `workload telemetry`.
4. Payload duoc gui toi `Telemetry Ingestion Service`.
5. `Stream Processing` enrich topology va tao snapshot.
6. `Monitoring Service` va `AR diagnostics` consume serving state da duoc compose.

### 9.2. Mo hinh thanh phan node-local

`node-local collector` co the gom:

- `host metrics reader`
- `docker inventory reader`
- `docker stats reader`
- `windows service/process reader`
- `simulation event reader`
- `payload normalizer`
- `transport sender`

Khong can tat ca thanh phan deu bat o phase dau.

## 10. Payload normalized de xuat

Moi workload sau khi normalize nen theo envelope chung:

```json
{
  "metricKey": "workload.cpu_usage_pct",
  "scopeType": "workload",
  "scopeId": "workload-api-01",
  "nodeId": "node-host-01",
  "rackId": "rack-a1",
  "switchId": "sw-a1",
  "serviceId": "svc-monitoring-api",
  "instanceId": "inst-monitoring-api-01",
  "value": 14.2,
  "unit": "%",
  "timestamp": "2026-06-04T10:30:00Z",
  "source": "docker_stats",
  "sourceMetric": "cpu_percent",
  "tags": {
    "runtimeType": "docker",
    "serviceName": "monitoring-api",
    "instanceName": "monitoring-api-1",
    "environment": "poc"
  }
}
```

Inventory va status updates co the dung envelope rieng:

```json
{
  "scopeType": "workload",
  "nodeId": "node-host-01",
  "serviceId": "svc-monitoring-api",
  "instanceId": "inst-monitoring-api-01",
  "runtimeType": "docker",
  "serviceName": "monitoring-api",
  "instanceName": "monitoring-api-1",
  "status": "running",
  "lastSeen": "2026-06-04T10:30:00Z",
  "restartCount": 0,
  "imageOrBinary": "monitoring-api:latest",
  "ports": [
    "3000:3000"
  ],
  "labels": {
    "tier": "backend"
  }
}
```

## 11. Workload telemetry va technician workflow

Workload telemetry khong chi de monitoring.
No phai giup `Maintenance Technician` thao tac duoc ma khong can thay thong tin nhay cam.

### 11.1. Technician can biet gi

Nen cho technician thay:

- service name
- workload status
- restart count
- CPU va memory co ban
- last seen
- muc do anh huong
- canh bao lien quan da duoc loc
- checklist maintenance lien quan

### 11.2. Technician khong nen thay gi

Khong nen expose:

- secret
- token
- connection string
- raw environment variables
- full internal topology ngoai pham vi ticket
- raw debug log nhay cam
- thong tin admin/user khong lien quan

### 11.3. Use case technician lien quan toi workload

1. Xac dinh workload nao dang bi anh huong sau khi quet marker.
2. Xem workload dang `running`, `stopped`, `degraded`, hay `restarting`.
3. Doi chieu alert voi workload cu the tren node.
4. Lam checklist bao tri dua tren tinh trang workload.
5. Xac nhan workload da phuc hoi truoc khi nop inspection result.

## 12. Workload telemetry cho AI analytics va training

Workload telemetry co gia tri lon cho:

- anomaly detection
- risk scoring
- predictive maintenance
- post-maintenance verification

Nen luu du lieu de training theo 4 nhom:

### 12.1. Inventory va topology context

- node nao dang chay workload nao
- workload thuoc rack/switch nao theo asset context
- workload category

### 12.2. Time-series metrics

- CPU
- memory
- network I/O
- response time neu co
- restart count trend
- heartbeat delay neu co

### 12.3. Operational labels

- alert duoc tao hay khong
- severity
- incident co mo hay khong
- ticket co duoc dispatch hay khong
- inspection result

### 12.4. Simulation labels

- fault type
- fault start time
- fault duration
- fault target workload
- maintenance outcome

Neu chua co label incident that, simulation event la nguon label rat huu ich cho giai doan dau.

## 13. Backlog workload telemetry theo phase

### 13.1. Phase 1

- service name
- instance name
- runtime type
- node mapping
- running/stopped
- last seen
- restart count
- CPU va memory co ban

### 13.2. Phase 2

- network I/O
- health score
- risk score
- process-level discovery
- service grouping rule

### 13.3. Phase 3

- response time
- error rate
- heartbeat delay
- anomaly score
- predictive incident feature windows

## 14. Kien nghi implementation cho PoC

Neu can chot scope implementation thuc dung:

1. Giu `Windows Exporter` cho `node metrics`.
2. Them `workload discovery` rieng.
3. Neu co Docker, uu tien Docker API cho inventory va stats.
4. Neu workload chay local, bo sung process/service discovery.
5. Dung simulation de tao fault labels va scenario, khong dung de thay the toan bo real workload.

Huong nay giu duoc:

- node telemetry on dinh
- workload telemetry co nghia van hanh
- technician co du context de maintenance
- AI co them du lieu va label de hoc

## 15. Ket luan

`Workload telemetry` trong de tai nay nen duoc xem la lop `runtime context` chay tren node, bo sung cho `node metrics`, khong thay the cho node telemetry.

Trong PoC:

- `Windows Exporter` nen la nguon chinh cho node metrics
- `Docker/process/service discovery` nen la nguon chinh cho workload telemetry
- `simulation` nen dong vai tro tao scenario va label co kiem soat

Tai lieu nay nen duoc xem la baseline cho:

- collector architecture o cap workload
- payload schema cho ingest
- workload dashboard va AR diagnostics
- AI feature engineering cho workload-level analytics
