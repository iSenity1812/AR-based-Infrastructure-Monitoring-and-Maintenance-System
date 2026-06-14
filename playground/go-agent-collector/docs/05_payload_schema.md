# Go Agent Collector Payload Schema

## 1. Muc tieu

Tai lieu nay chot `payload schema` ma `go-agent-collector` gui ve backend ingest API.

Muc tieu:

- xac dinh contract on dinh giua agent va backend
- giu payload du de dashboard, AR, AI va predict incident su dung
- tach ro phan `batch`, `metric record`, va `agent metadata`
- giup code Go co schema ro truoc khi implement sender

## 2. Nguyen tac thiet ke payload

Payload nen giu 6 nguyen tac:

- on dinh giua Windows va Linux
- tu mo ta duoc metric ma khong can biet raw source ben ngoai
- batch-friendly
- de validate o backend
- du context de trace va debug
- khong qua phinh cho MVP

## 3. Don vi payload

Agent khong nen gui tung metric le.
Don vi gui di nen la `batch payload`.

Moi batch payload gom:

- metadata cua agent
- danh sach metric records
- runtime timestamps
- thong tin ve source va schema version

## 4. Top-level payload structure

Payload top-level nen co:

- `schemaVersion`
- `agent`
- `batch`
- `context`
- `metrics`

## 5. Top-level fields

### 5.1. `schemaVersion`

Cho phep backend biet payload dang theo version nao.

Goi y:

- `v1`

### 5.2. `agent`

Chua context cua local agent:

- `agentId`
- `agentName`
- `sourceType`
- `agentVersion`
- `hostname`

### 5.3. `batch`

Chua metadata cua lan gui:

- `batchId`
- `collectedAt`
- `sentAt`
- `recordCount`
- `sequence`

### 5.4. `metrics`

Mang chua danh sach metric records da duoc normalize.

### 5.5. `context`

Shared context duoc gui 1 lan moi batch de tranh lap node-level metadata tren tung metric.

`context` gom 2 nhom:

- `identity`
- `hardwareFingerprint`

## 6. Metric record structure

Moi metric record nen co:

- `metricKey`
- `scopeType`
- `scopeId`
- `value`
- `unit`
- `timestamp`
- `source`
- `sourceMetric`
- `tags`

`tags` luc nay chi nen giu phan metric-specific hoac scope-specific labels.

## 7. Field spec chi tiet

### 7.1. `metricKey`

Ten metric domain cua he thong.

Vi du:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.tcp_retransmit_pct`

Field nay la bat buoc.

### 7.2. `scopeType`

Cho MVP node agent, field nay chu yeu la:

- `node`

Sau nay co the mo rong:

- `interface`
- `service`
- `container`
- `operations`

### 7.3. `scopeId`

ID cua scope metric.

Vi du:

- `node-host-01`

Day la bat buoc.

### 7.4. `value`

Gia tri metric sau khi normalize.

Cho phep cac kieu:

- number
- string
- boolean

Cho MVP node metrics, phan lon se la number.

### 7.5. `unit`

Don vi chuan cua metric.

Vi du:

- `%`
- `bytes`
- `bytes/sec`
- `count`
- `count/sec`
- `seconds`
- `timestamp`
- `state`
- `text`

### 7.6. `timestamp`

Thoi diem metric duoc gan sau khi normalize.

Nen dung:

- ISO 8601 UTC

Vi du:

- `2026-05-28T12:30:00Z`

### 7.7. `source`

Nguon observed chinh.

Vi du:

- `windows_exporter`
- `node_exporter`

Field nay giup debug va route mapping.

### 7.8. `sourceMetric`

Ten raw metric goc tu exporter.

Vi du:

- `windows_cpu_time_total`
- `windows_net_bytes_received_total`

Field nay rat quan trong khi can trace mapping sai.

### 7.9. `tags`

Metadata enrich bo sung.

Vi du sau khi toi uu:

- `core`
- `family`
- `nic`
- `build_number`
- `version`
- `container_id`
- `container_name`
- `service_name`
- `image`
- `image_tag`

Khong dua vao `tags` cac field node-level da duoc gom chung:

- `hostname`
- `nodeId`
- `deviceType`
- `rackId`
- `site`
- `switchId`
- `environment`

### 7.10. `context.identity`

Metadata nhan dien node duoc chia se cho ca batch:

- `hostname`
- `nodeId`
- `source`
- `deviceType`

### 7.11. `context.hardwareFingerprint`

Fingerprint phuc vu discovery/register:

- `primaryIpv4`
- `macAddress`
- `hardwareSerial`
- `osProduct`
- `logicalCpuCount`
- `cpuArchitecture`

## 8. Tags bat buoc va tags nen co

### 8.1. Shared context bat buoc

Nen co:

- `context.identity.hostname`
- `context.identity.nodeId`
- `context.identity.source`

### 8.2. Tags nen co

Nen co neu metric can:

- `core`
- `family`
- `nic`
- `build_number`
- `version`
- `container_id`
- `container_name`
- `service_name`

## 9. Agent metadata structure

`agent` object nen co:

- `agentId`
- `agentName`
- `sourceType`
- `agentVersion`
- `hostname`
- `startedAt`

Vi du:

- `sourceType = windows_exporter`

## 10. Batch metadata structure

`batch` object nen co:

- `batchId`
- `sequence`
- `collectedAt`
- `sentAt`
- `recordCount`
- `droppedCount`

`droppedCount` rat huu ich neu queue hoac buffer bi overflow.

## 11. Payload JSON example

```json
{
  "schemaVersion": "v1",
  "agent": {
    "agentId": "agent-win-01",
    "agentName": "laptop-main",
    "sourceType": "windows_exporter",
    "agentVersion": "0.1.0",
    "hostname": "MSI",
    "startedAt": "2026-05-28T12:00:00Z"
  },
  "batch": {
    "batchId": "01JY3V8XJ52B4QZ1Q0JYV4NXX9",
    "sequence": 18,
    "collectedAt": "2026-05-28T12:30:00Z",
    "sentAt": "2026-05-28T12:30:01Z",
    "recordCount": 4,
    "droppedCount": 0
  },
  "context": {
    "identity": {
      "hostname": "MSI",
      "nodeId": "node-host-01",
      "source": "multi_source",
      "deviceType": "laptop"
    },
    "hardwareFingerprint": {
      "primaryIpv4": "10.10.9.11",
      "macAddress": "94:E9:79:A1:B2:C3",
      "hardwareSerial": "FX80GE-9382173",
      "osProduct": "Windows 11 Pro",
      "logicalCpuCount": "16",
      "cpuArchitecture": "x86_64"
    }
  },
  "metrics": [
    {
      "metricKey": "node.cpu_usage_pct",
      "scopeType": "node",
      "scopeId": "node-host-01",
      "value": 37.4,
      "unit": "%",
      "timestamp": "2026-05-28T12:30:00Z",
      "source": "windows_exporter",
      "sourceMetric": "windows_cpu_time_total",
      "tags": {
        "core": "0,0"
      }
    },
    {
      "metricKey": "container.cpu_usage_pct",
      "scopeType": "container",
      "scopeId": "container-redpanda-1",
      "value": 71.2,
      "unit": "%",
      "timestamp": "2026-05-28T12:30:00Z",
      "source": "docker",
      "sourceMetric": "docker.stats.cpu",
      "tags": {
        "container_id": "1591d7a55c8b56d8a0b58e3a4be1f58816c98946c64711771c34a1543afcc2c8",
        "container_name": "redpanda-data-processing-redpanda-1",
        "service_name": "redpanda",
        "image": "docker.redpanda.com/redpandadata/redpanda",
        "image_tag": "v25.3.15-fips"
      }
    },
    {
      "metricKey": "node.os_product",
      "scopeType": "node",
      "scopeId": "node-host-01",
      "value": "Windows 11 Pro",
      "unit": "text",
      "timestamp": "2026-05-28T12:30:00Z",
      "source": "windows_exporter",
      "sourceMetric": "windows_os_info",
      "tags": {
        "build_number": "26200",
        "revision": "8457",
        "version": "10.0.26200"
      }
    }
  ]
}
```

## 12. Field nao nen o top-level, field nao nen o tags

### 12.1. Nen o top-level metric record

Nen de o top-level khi:

- field la cot loi cua schema
- backend can index/validate nhat quan

Vi du:

- `metricKey`
- `scopeType`
- `scopeId`
- `value`
- `unit`
- `timestamp`
- `source`
- `sourceMetric`
- `context.identity.*`
- `context.hardwareFingerprint.*`

### 12.2. Nen de trong `tags`

Nen de trong tags khi:

- field la metric-specific delta
- field phan biet record cung scope
- field thuoc container/service/network/core cu the

Vi du:

- `core`
- `family`
- `nic`
- `build_number`
- `version`
- `container_id`
- `container_name`
- `service_name`

## 13. Kieu du lieu trong Go

Khi code Go, nen tu duy 3 struct chinh:

- `Payload`
- `BatchMeta`
- `MetricRecord`

Va co the them:

- `AgentMeta`

`value` trong Go co the can custom type hoac `any`, nhung cho MVP node metrics number chiem da so.

## 14. Validation rules

Backend va agent deu nen validate:

- `schemaVersion` khong rong
- `agent.agentId` khong rong
- `batch.batchId` khong rong
- `metrics` khong duoc null
- moi metric phai co `metricKey`
- moi metric phai co `scopeType`
- moi metric phai co `scopeId`
- moi metric phai co `timestamp`
- moi metric phai co `unit`
- `value` phai hop le voi metric do

Trang thai implement hien tai:

- agent validate payload truoc khi goi HTTP sender
- loi validation duoc xem la non-retryable contract error
- nhom test sender validate backend contract co trong code

## 15. Co nen dua raw labels day du vao payload khong

Cho MVP, khong nen.

Ly do:

- payload se phinh nhanh
- backend khong can het labels raw
- lam metric contract kho on dinh

Thay vao do:

- giu `sourceMetric`
- giu mot vai labels can thiet trong `tags`

## 16. Co nen nen compress batch khong

Cho PoC, co the de sau.

MVP:

- JSON batch thuong

Sau nay:

- gzip request body neu can

## 17. Payload cho buffer nen giong payload gui that khong

Nen giong.

Ly do:

- de replay don gian
- khong can transform lai
- giam logic phuc tap trong retry

Tuc la local buffer nen luu:

- full batch payload

## 18. Ket luan

Payload schema tot nhat cho agent nay la:

- top-level batch ro rang
- metric records normalized
- tags de enrich context
- schema on dinh giua Windows va Linux

Tai lieu nay la nen cho:

- `sender/http.go`
- `sender/validate.go`
- `sender/payload.go`
- backend ingest contract
- local buffer replay format
