# Go Agent Collector Config Design

## 1. Muc tieu

Tai lieu nay mo ta thiet ke config cho `go-agent-collector`.

Muc tieu:

- chot cac file config can co
- tach ro config runtime, asset metadata, va metric mapping
- giu config de mo rong tu `Windows` sang `Linux`
- giam hardcode trong code Go

## 2. Nguyen tac thiet ke config

Config nen giu 5 nguyen tac:

- de doc va de sua bang tay
- ro ranh gioi giua runtime va business mapping
- cho phep override theo moi truong
- ho tro them source moi ma khong doi backend contract
- du on dinh cho MVP nhung khong khoa mo rong

## 3. Tai sao nen dung YAML

YAML hop voi bai toan nay vi:

- de doc hon JSON cho file config tay
- hop voi mapping rule co nhieu field
- de tach tung file theo trach nhiem
- quen thuoc trong he thong agent / infra

Neu ve sau can stricter validation, Go van co the parse YAML roi validate thanh struct.

## 4. Bo file config de xuat

Cho MVP, nen co 4 file chinh:

1. `agent.yaml`
2. `assets.yaml`
3. `metrics.windows.yaml`
4. `metrics.linux.yaml`

Trong giai doan dau, `metrics.linux.yaml` co the chua dung ngay, nhung nen duoc dat ten va trach nhiem san de architecture khong bi lech.

## 5. Vai tro cua tung file

### 5.1. `agent.yaml`

Chua runtime config cua agent:

- backend endpoint
- scrape interval
- send interval
- batch size
- timeout
- retry
- local buffer
- logging

File nay khong nen chua mapping metric cu the.

### 5.2. `assets.yaml`

Chua metadata cua node va context topology:

- `nodeId`
- `rackId`
- `switchId`
- `site`
- `environment`
- `primaryUplink`
- marker hoac rack code neu can enrich sau nay

File nay giup agent gan context vao payload ma khong phai hardcode trong code.

### 5.3. `metrics.windows.yaml`

Chua mapping tu `windows_exporter` sang `domain metrics`.

Vi du:

- source metric name
- metric key
- unit
- labels duoc giu
- aggregation mode
- enabled hay khong

### 5.4. `metrics.linux.yaml`

Chua mapping tu `node_exporter` sang cung `domain metrics`.

Y nghia rat quan trong:

- raw input khac nhau
- mapping khac nhau
- output schema giong nhau

## 6. `agent.yaml` nen co gi

### 6.1. Nhom `agent`

Chua thong tin dinh danh va mode chay:

- `agentId`
- `agentName`
- `mode`
- `sourceType`

Vi du:

- `sourceType = windows_exporter`

### 6.2. Nhom `scrape`

Chua:

- `endpoint`
- `interval`
- `timeout`
- `maxBodySizeMb`

Vi du giai doan dau:

- endpoint `http://localhost:9182/metrics`
- interval `5s`

### 6.3. Nhom `send`

Chua:

- backend URL
- HTTP timeout
- batch item limit
- flush interval
- headers hoac auth token neu co

### 6.4. Nhom `retry`

Chua:

- min backoff
- max backoff
- max attempts neu can
- retryable status codes

### 6.5. Nhom `buffer`

Chua:

- enabled hay khong
- storage type
- path
- max size MB
- drop policy

### 6.6. Nhom `logging`

Chua:

- log level
- output
- format

### 6.7. Nhom `features`

Chua feature flags cho:

- config reload
- local health endpoint
- internal metrics
- linux adapter

## 7. `assets.yaml` nen co gi

### 7.1. Muc tieu

`assets.yaml` la noi agent lay topology context va host identity logic.

### 7.2. Cac field chinh

Nen co:

- `nodeId`
- `nodeName`
- `hostname`
- `rackId`
- `switchId`
- `site`
- `environment`
- `deviceType`
- `primaryUplink`
- `primaryNicHint`

### 7.3. `primaryNicHint` de lam gi

Day la goi y de agent chon NIC chinh neu may co nhieu adapter.

Neu co field nay, agent uu tien:

1. chon NIC trung `primaryNicHint`
2. neu khong tim thay, fallback sang rule chon NIC `up` co traffic chinh

### 7.4. NIC la gi

`NIC` = `Network Interface Card`, de hieu don gian la `card mang` hoac `adapter mang`.

Trong may Windows cua ban, moi thu nhu:

- `Wi-Fi`
- `Ethernet`
- `Radmin VPN`
- virtual adapter

deu co the duoc xem la mot `NIC`.

Trong agent, minh can biet `primary NIC` vi:

- may co nhieu adapter cung luc
- khong phai adapter nao cung la duong ket noi chinh
- network metrics o cap `node` can co quy tac tong hop ro rang

Neu khong chot `primary NIC`, metric nhu throughput, errors, uplink status de bi nhieu.

## 8. `metrics.windows.yaml` nen co gi

### 8.1. Muc tieu

File nay la trung tam cua mapping layer cho Windows.

### 8.2. Moi rule mapping nen co

Moi rule nen co it nhat:

- `key`
- `enabled`
- `sourceMetric`
- `scopeType`
- `unit`
- `valueType`
- `aggregation`
- `keepLabels`
- `notes`

### 8.3. Cac kieu aggregation goi y

Nen chot mot tap nho de de code:

- `direct`
- `rate`
- `sum`
- `avg`
- `max`
- `select_primary_nic`
- `derive_uptime`
- `derive_ratio`

### 8.4. Vi du y nghia

- `direct`: lay thang gia tri raw
- `rate`: tinh tren counter delta
- `sum`: tong hop nhieu label series
- `avg`: lay trung binh
- `select_primary_nic`: chi lay metric thuoc NIC duoc chon
- `derive_uptime`: tinh uptime tu boot time
- `derive_ratio`: tinh ty le tu 2 raw metrics

## 9. `metrics.linux.yaml` nen co gi

File Linux nen giong cau truc Windows, chi khac:

- `sourceMetric`
- labels goc
- mot vai rule aggregation nho

Dieu quan trong la:

- `metric key` ben output van giong Windows

Vi du:

- Windows `windows_system_boot_time_timestamp`
- Linux `node_boot_time_seconds`
- ca hai deu ra `node.uptime_seconds`

## 10. Cac nhom metric mapping nen tach ro

Trong file metric mapping, nen chia theo nhom:

- `compute`
- `memory`
- `storage`
- `network`
- `runtime`
- `stability`
- `derived`

Tach nhu vay de:

- de review
- de bat/tat theo nhom
- de mo rong dan

## 11. Config validation nen co

Khi agent boot, nen validate:

- field bat buoc co ton tai
- duration hop le
- batch size > 0
- endpoint hop le
- sourceType duoc ho tro
- metric rule khong trung key
- aggregation mode hop le

Neu config sai:

- fail som khi boot
- log ro file va field nao sai

## 12. Co nen tach secrets ra rieng khong

Nen.

Neu backend can token hoac API key, co 2 cach:

- dat trong env var
- hoac file override rieng khong commit

Cho MVP, minh khuyen:

- file YAML chua config cong khai
- secret lay tu env var

Vi du:

- `GO_AGENT_API_TOKEN`

## 13. Config load strategy

Cho MVP, nen don gian:

1. load `agent.yaml`
2. load `assets.yaml`
3. load file mapping theo `sourceType`
4. apply env override neu co
5. validate
6. freeze thanh runtime config object

Sau nay moi them:

- hot reload
- remote config
- signed config

## 14. Vi du file structure config

```text
configs/
  agent.yaml
  assets.yaml
  metrics.windows.yaml
  metrics.linux.yaml
```

## 15. Vi du `agent.yaml`

```yaml
agent:
  agentId: agent-win-01
  agentName: laptop-main
  sourceType: windows_exporter

scrape:
  endpoint: http://localhost:9182/metrics
  interval: 5s
  timeout: 3s

send:
  endpoint: http://localhost:8080/api/telemetry/ingest
  interval: 5s
  timeout: 5s
  maxBatchItems: 200

retry:
  minBackoff: 1s
  maxBackoff: 30s

buffer:
  enabled: true
  path: data/buffer
  maxSizeMb: 50

logging:
  level: info
```

## 16. Vi du `assets.yaml`

```yaml
node:
  nodeId: node-host-01
  nodeName: laptop-main
  hostname: MSI
  deviceType: laptop

topology:
  rackId: rack-a1
  switchId: sw-a1
  site: lab-local
  environment: poc

network:
  primaryUplink: wifi
  primaryNicHint: RZ608 Wi-Fi 6E 80MHz
```

## 17. Vi du `metrics.windows.yaml`

```yaml
metrics:
  - key: node.uptime_seconds
    enabled: true
    sourceMetric: windows_system_boot_time_timestamp
    scopeType: node
    unit: seconds
    valueType: gauge
    aggregation: derive_uptime

  - key: node.network_rx_bytes_sec
    enabled: true
    sourceMetric: windows_net_bytes_received_total
    scopeType: node
    unit: bytes/sec
    valueType: counter
    aggregation: select_primary_nic_rate
    keepLabels:
      - nic
```

## 18. Quy tac thiet ke quan trong

- `agent.yaml` khong chua mapping chi tiet
- `assets.yaml` khong chua runtime retry logic
- `metrics.*.yaml` khong chua backend endpoint
- output metric key phai on dinh giua Windows va Linux
- config nen la nguon su that cho mapping, khong phai code

## 19. Ket luan

Huong config tot nhat cho agent nay la:

- mot file runtime
- mot file asset/topology context
- mot file mapping cho moi source

Voi cach nay, khi code Go, minh se de dang:

- validate config
- thay source adapter
- them Linux
- giu output contract chung cho backend
