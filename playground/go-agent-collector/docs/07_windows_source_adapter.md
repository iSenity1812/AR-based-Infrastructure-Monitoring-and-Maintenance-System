# Go Agent Collector Windows Source Adapter

## 1. Muc tieu

Tai lieu nay mo ta `Windows source adapter` cho `go-agent-collector`.

Muc tieu:

- chot trach nhiem cua adapter khi lam viec voi `windows_exporter`
- chot input, output va ranh gioi voi parser, mapping, state
- giu implementation de code trong Go sau nay
- bam sat nhung metric da verify tren `localhost:9182/metrics`

## 2. Vai tro cua Windows source adapter

`Windows source adapter` la lop noi giua:

- `windows_exporter`
- va raw metric model ma agent su dung noi bo

No khong nen:

- tinh health score
- tinh risk score
- build payload backend
- chua business logic AR

No nen:

- scrape endpoint local
- parse Prometheus exposition format
- filter metric families lien quan
- dua du lieu ve raw model thong nhat
- cung cap context can thiet cho mapping va aggregation

## 3. Input cua adapter

Adapter doc tu:

- `agent.yaml.scrape.endpoint`
- `agent.yaml.scrape.timeout`
- `metrics.windows.yaml`
- `assets.yaml`

Nguon chinh:

- `http://localhost:9182/metrics`

## 4. Output cua adapter

Adapter khong tra ve payload gui backend ngay.
No nen tra ve `raw metric snapshot`.

Snapshot nen gom:

- `collectedAt`
- `sourceType`
- `families`
- `samples`

Trong do moi `sample` nen co:

- `metricName`
- `labels`
- `value`
- `metricType`

## 5. Ranh gioi voi parser

De code dep, adapter va parser nen tach nhau:

- adapter lo HTTP scrape
- parser lo parse Prometheus text format

Flow nen la:

1. adapter goi HTTP
2. adapter nhan text body
3. adapter dua body qua parser
4. parser tra ve metric families/samples
5. adapter filter lai theo allowlist neu can

## 6. Ranh gioi voi mapping engine

Adapter khong nen map truc tiep sang `node.*`.

Adapter chi nen biet:

- raw metrics nao co mat
- labels nao dang co
- nguon metric la gi

Mapping engine moi la noi:

- map raw metric sang domain metric
- ap dung rule `cpu_usage_from_idle`
- ap dung `select_primary_nic_rate`
- ap dung `system_drive_used_pct`

## 7. Allowlist metric families cho Windows

Adapter nen allowlist theo family de giam noise.

Cho host hien tai, family uu tien la:

- `windows_cpu_*`
- `windows_memory_*`
- `windows_logical_disk_*`
- `windows_net_*`
- `windows_os_*`
- `windows_system_*`
- `windows_tcp_*`

Khong nen ingest:

- `go_*`
- `process_*`
- `promhttp_*`

Tru khi sau nay muon quan sat chinh `windows_exporter`.

## 8. Raw metrics da verify tren host hien tai

Adapter nen ky vong va ho tro nhung metric da verify:

- `windows_cpu_time_total`
- `windows_cpu_logical_processor`
- `windows_cpu_core_frequency_mhz`
- `windows_cpu_dpcs_total`
- `windows_cpu_interrupts_total`
- `windows_cpu_parking_status`
- `windows_memory_available_bytes`
- `windows_memory_physical_total_bytes`
- `windows_memory_committed_bytes`
- `windows_memory_commit_limit`
- `windows_memory_cache_bytes`
- `windows_memory_pool_paged_bytes`
- `windows_memory_pool_nonpaged_bytes`
- `windows_memory_page_faults_total`
- `windows_memory_transition_faults_total`
- `windows_logical_disk_free_bytes`
- `windows_logical_disk_size_bytes`
- `windows_logical_disk_read_bytes_total`
- `windows_logical_disk_write_bytes_total`
- `windows_logical_disk_reads_total`
- `windows_logical_disk_writes_total`
- `windows_logical_disk_read_seconds_total`
- `windows_logical_disk_write_seconds_total`
- `windows_logical_disk_requests_queued`
- `windows_logical_disk_split_ios_total`
- `windows_net_bytes_received_total`
- `windows_net_bytes_sent_total`
- `windows_net_bytes_total`
- `windows_net_current_bandwidth_bytes`
- `windows_net_nic_address_info`
- `windows_net_nic_info`
- `windows_net_nic_operation_status`
- `windows_net_output_queue_length_packets`
- `windows_net_packets_received_total`
- `windows_net_packets_sent_total`
- `windows_net_packets_received_errors_total`
- `windows_net_packets_outbound_errors_total`
- `windows_net_packets_received_discarded_total`
- `windows_net_packets_outbound_discarded_total`
- `windows_os_hostname`
- `windows_os_info`
- `windows_system_boot_time_timestamp`
- `windows_system_processes`
- `windows_system_threads`
- `windows_system_processor_queue_length`
- `windows_system_context_switches_total`
- `windows_system_exception_dispatches_total`
- `windows_system_system_calls_total`
- `windows_tcp_connections_established`
- `windows_tcp_connections_state_count`
- `windows_tcp_connection_failures_total`
- `windows_tcp_connections_reset_total`
- `windows_tcp_connections_active_total`
- `windows_tcp_connections_passive_total`
- `windows_tcp_segments_retransmitted_total`
- `windows_tcp_segments_total`

## 9. Optional metrics

Adapter nen cho phep ho tro them sau nay, nhung khong duoc assume la luon co:

- `windows_service_state`
- `windows_pagefile_usage_pct`
- `windows_memory_pages_input_total`
- `windows_memory_pages_output_total`

Neu khong co:

- khong crash
- ghi debug log neu can
- bo qua metric rule optional do

## 10. Label patterns can biet

Adapter can biet mot so label pattern quan trong.

### 10.1. CPU

Thuong co:

- `core`
- `mode`
- co the co `_Total` hoac chuoi core theo kieu `0,0`

### 10.2. Network

Thuong co:

- `nic`
- voi `windows_net_nic_address_info` co them:
  - `address`
  - `family`

### 10.3. TCP

Thuong co:

- `af`
- `state`

### 10.4. OS info

Thuong co labels metadata:

- `product`
- `version`
- `build_number`
- `revision`

### 10.5. Disk

Thuong co label cho drive/volume.
Adapter nen giu lai raw labels day du de mapping layer chon drive system.

## 11. Scrape flow trong adapter

Trong moi chu ky scrape, adapter nen:

1. tao HTTP request den endpoint
2. ap dung timeout
3. doc response body
4. validate status code = 200
5. parse body thanh metric families
6. filter allowlist
7. tra ve raw snapshot

Neu co loi o bat ky buoc nao:

- tra ve error co context
- khong panic

## 12. Error cases can xu ly

Adapter can handle:

- endpoint khong reachable
- timeout
- HTTP status khac `200`
- body rong
- parser loi
- metric family bi thieu

Cach xu ly:

- log co context
- bo cycle hien tai
- de runtime loop tiep tuc cycle sau

## 13. NIC context tren host hien tai

Dump exporter hien tai cho thay:

- `RZ608 Wi-Fi 6E 80MHz` co traffic chinh
- `Realtek PCIe GbE Family Controller` dang `down`
- `Teredo Tunneling Pseudo-Interface` co mot so metric networking
- `Famatech Radmin VPN Ethernet Adapter` co mat o `nic_info` va `nic_address_info`

Adapter khong nen tu chot `primary NIC` cuoi cung, nhung can giu day du data raw de mapping/aggregation layer chon.

## 14. Disk context tren host hien tai

Adapter can giu raw logical disk metrics day du vi:

- mapping layer can chon drive he thong
- dashboard/AR ve sau co the can detail theo drive

Voi MVP node-level, mapping layer se tong hop ve:

- `node.disk_free_gb`
- `node.disk_used_pct`
- `node.disk_read_bytes_sec`
- `node.disk_write_bytes_sec`

## 15. Raw model de xuat trong Go

Adapter nen tra ve model don gian, vi du:

```go
type RawSample struct {
    MetricName  string
    Labels      map[string]string
    Value       float64
    MetricType  string
}

type RawSnapshot struct {
    SourceType  string
    CollectedAt time.Time
    Samples     []RawSample
}
```

Cho MVP, model nay la du.

## 16. Interface de xuat

Adapter Windows nen implement mot interface chung, vi du:

```go
type SourceAdapter interface {
    Collect(ctx context.Context) (RawSnapshot, error)
    Name() string
}
```

Adapter Windows:

- `Name() = windows_exporter`

## 17. Config can cho adapter

Adapter can nhung config sau:

- `scrape.endpoint`
- `scrape.timeout`
- `scrape.maxBodySizeMb` neu co
- `agent.sourceType`

No khong can biet:

- backend send endpoint
- retry send policy
- batch size send

## 18. Internal metrics nen co cho adapter

Adapter nen phat sinh internal metrics noi bo:

- `scrape_success_count`
- `scrape_fail_count`
- `last_scrape_duration_ms`
- `last_scrape_at`
- `parsed_sample_count`
- `filtered_sample_count`

Nhung metric nay de debug agent rat tot.

## 19. Adapter nen de parser strip gi

Parser hoac adapter nen bo qua:

- comments `# HELP`
- comments `# TYPE`
- metric families ngoai allowlist

Nhung nen giu:

- metric type thong bao bo tro debug
- labels raw can cho mapping

## 20. Co nen filter ngay trong adapter hay de sau

Cho MVP, nen filter ngay trong adapter.

Ly do:

- giam memory pressure
- giam luong raw data dua ve pipeline
- giam noise

Nhung filter nen theo config-driven allowlist, khong hardcode cung.

## 21. Optional future mo rong

Sau nay adapter Windows co the them:

- detect service collector co bat hay khong
- merge them local diagnostics endpoint
- enrich pagefile metrics neu collector co mat
- phan biet physical NIC va virtual NIC ro hon

Nhung nhung cai do nen de sau MVP.

## 22. Khuyen nghi implementation cho MVP

Cho MVP, adapter Windows nen:

- scrape `localhost:9182/metrics`
- parse Prometheus text
- filter family theo allowlist
- tra `RawSnapshot`
- khong lam them business logic

Tat ca logic:

- primary NIC
- system drive
- rate
- ratio
- domain mapping

nen de cho tang sau xu ly.

## 23. Ket luan

`Windows source adapter` nen la mot lop rat ro vai tro:

- no noi chuyen voi `windows_exporter`
- no tra ve raw data on dinh
- no khong om mapping va scoring

Neu giu dung ranh gioi nay, minh se de dang:

- viet adapter Linux sau nay
- test parser va mapping doc lap
- scaffold code Go sach va mo rong duoc
