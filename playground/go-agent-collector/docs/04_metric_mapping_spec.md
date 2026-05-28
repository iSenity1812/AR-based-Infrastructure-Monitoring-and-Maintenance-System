# Go Agent Collector Metric Mapping Spec

## 1. Muc tieu

Tai lieu nay chot `metric mapping spec` cho `go-agent-collector` khi scrape `windows_exporter`.

Muc tieu:

- map raw Prometheus metrics sang `domain metrics` cua he thong
- chi ro metric nao da `verify` tren host hien tai
- tach ro metric nao la `optional`
- giu phu hop voi context du an AR + AI maintenance va predict incident

Tai lieu nay duoc doi chieu truc tiep voi:

- `http://localhost:9182/metrics`
- `docs/telemetry/node_metrics_windows_exporter.md`
- `playground/go-agent-collector/docs/03_config_design.md`

## 2. Nguyen tac cua mapping spec

Spec nay dung 3 muc:

1. `verified_now`
   - metric da thay that tren host Windows hien tai

2. `optional_by_collector`
   - metric hop ly cho design, nhung chua thay tren host hien tai vi collector chua bat hoac context chua co

3. `derived`
   - metric do agent hoac backend tinh ra tu raw metrics

Cho MVP, agent nen uu tien:

- `verified_now`
- mot so `derived` nhe trong agent

## 3. Nguon raw metrics da verify tren localhost:9182

Nhung metric family da verify co mat tren host hien tai:

- `windows_cpu_*`
- `windows_memory_*`
- `windows_logical_disk_*`
- `windows_net_*`
- `windows_os_hostname`
- `windows_os_info`
- `windows_system_*`
- `windows_tcp_*`

Nhung metric quan trong da verify cu the:

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

## 4. Nhung metric khong thay tren host hien tai

Nhung metric duoc nhac den trong design nhung chua thay tren host hien tai:

- `windows_cs_physical_memory_bytes`
- `windows_pagefile_usage_pct`
- `windows_service_state`
- `windows_memory_pages_input_total`
- `windows_memory_pages_output_total`

Spec se khong dua chung vao MVP mapping bat buoc.
Neu sau nay collector duoc bat them, minh co the bo sung vao mapping file.

## 5. Category mapping cho node

Mapping se duoc chot theo 8 nhom:

1. `identity_and_inventory`
2. `compute`
3. `memory`
4. `storage`
5. `network`
6. `tcp_connection_health`
7. `runtime_and_os`
8. `derived_and_optional`

## 6. Mapping format chuan

Moi mapping rule trong `metrics.windows.yaml` nen theo shape logic sau:

- `category`
- `key`
- `status`
- `sourceMetric`
- `aggregation`
- `unit`
- `scopeType`
- `keepLabels`
- `notes`

`status` chi nen dung:

- `verified_now`
- `optional_by_collector`
- `derived`

## 7. Mapping spec chi tiet

### 7.1. Identity and inventory

| Category               | Metric Key               | Status       | Source Metric                                                 | Aggregation                                    | Unit  | Notes                                         |
| ---------------------- | ------------------------ | ------------ | ------------------------------------------------------------- | ---------------------------------------------- | ----- | --------------------------------------------- |
| identity_and_inventory | `node.hostname`          | verified_now | `windows_os_hostname`                                         | `label_value:hostname`                         | text  | Lay `hostname`, fallback `fqdn`               |
| identity_and_inventory | `node.os_product`        | verified_now | `windows_os_info`                                             | `label_value:product`                          | text  | Dung cho dashboard va AR context              |
| identity_and_inventory | `node.os_version`        | verified_now | `windows_os_info`                                             | `compose_labels:version,build_number,revision` | text  | Dung cho inventory                            |
| identity_and_inventory | `node.logical_cpu_count` | verified_now | `windows_cpu_logical_processor`                               | `direct`                                       | count | Input cho capacity va CPU normalization       |
| identity_and_inventory | `node.primary_nic_name`  | derived      | `windows_net_nic_operation_status`, `windows_net_bytes_total` | `select_primary_nic_name`                      | text  | Chon NIC `up` co traffic chinh hoac theo hint |
| identity_and_inventory | `node.primary_ipv4`      | verified_now | `windows_net_nic_address_info`                                | `primary_nic_ipv4`                             | text  | Chi lay IPv4 cua primary NIC                  |

### 7.2. Compute

| Category | Metric Key                    | Status       | Source Metric                           | Aggregation               | Unit      | Notes                                           |
| -------- | ----------------------------- | ------------ | --------------------------------------- | ------------------------- | --------- | ----------------------------------------------- |
| compute  | `node.cpu_usage_pct`          | verified_now | `windows_cpu_time_total`                | `cpu_usage_from_idle`     | %         | `100 - idle_pct`, loai bo core `_Total` neu can |
| compute  | `node.cpu_user_pct`           | verified_now | `windows_cpu_time_total`                | `cpu_mode_pct:user`       | %         | Lay mode `user`                                 |
| compute  | `node.cpu_privileged_pct`     | verified_now | `windows_cpu_time_total`                | `cpu_mode_pct:privileged` | %         | Lay mode `privileged`                           |
| compute  | `node.cpu_queue_length`       | verified_now | `windows_system_processor_queue_length` | `direct`                  | count     | Signal saturation som                           |
| compute  | `node.cpu_core_frequency_mhz` | verified_now | `windows_cpu_core_frequency_mhz`        | `avg_by:core`             | MHz       | Dung cho context, khong can AR overlay          |
| compute  | `node.cpu_dpc_rate`           | verified_now | `windows_cpu_dpcs_total`                | `sum_rate_by:core`        | count/sec | Chan doan driver/network pressure               |
| compute  | `node.cpu_interrupt_rate`     | verified_now | `windows_cpu_interrupts_total`          | `sum_rate_by:core`        | count/sec | Dung cho diagnostics                            |
| compute  | `node.cpu_parking_core_count` | verified_now | `windows_cpu_parking_status`            | `sum_by:core`             | count     | Co the de optional trong dashboard              |

### 7.3. Memory

| Category | Metric Key                           | Status                | Source Metric                                                           | Aggregation         | Unit      | Notes                                                  |
| -------- | ------------------------------------ | --------------------- | ----------------------------------------------------------------------- | ------------------- | --------- | ------------------------------------------------------ |
| memory   | `node.memory_available_mb`           | verified_now          | `windows_memory_available_bytes`                                        | `bytes_to_mb`       | MB        | Metric cot loi cho dashboard                           |
| memory   | `node.memory_used_bytes`             | verified_now          | `windows_memory_available_bytes`, `windows_memory_physical_total_bytes` | `derive_used_bytes` | bytes     | `total - available`                                    |
| memory   | `node.memory_used_pct`               | verified_now          | `windows_memory_available_bytes`, `windows_memory_physical_total_bytes` | `derive_used_pct`   | %         | Dung `physical_total_bytes`, khong dung `windows_cs_*` |
| memory   | `node.memory_total_bytes`            | verified_now          | `windows_memory_physical_total_bytes`                                   | `direct`            | bytes     | Capacity context                                       |
| memory   | `node.memory_committed_bytes`        | verified_now          | `windows_memory_committed_bytes`                                        | `direct`            | bytes     | Cho commit pressure                                    |
| memory   | `node.memory_commit_limit_bytes`     | verified_now          | `windows_memory_commit_limit`                                           | `direct`            | bytes     | Co mat tren host hien tai                              |
| memory   | `node.memory_commit_used_pct`        | verified_now          | `windows_memory_committed_bytes`, `windows_memory_commit_limit`         | `derive_ratio_pct`  | %         | Commit pressure                                        |
| memory   | `node.memory_cache_bytes`            | verified_now          | `windows_memory_cache_bytes`                                            | `direct`            | bytes     | Context them                                           |
| memory   | `node.memory_pool_paged_bytes`       | verified_now          | `windows_memory_pool_paged_bytes`                                       | `direct`            | bytes     | Kernel memory context                                  |
| memory   | `node.memory_pool_nonpaged_bytes`    | verified_now          | `windows_memory_pool_nonpaged_bytes`                                    | `direct`            | bytes     | Kernel memory context                                  |
| memory   | `node.memory_page_faults_rate`       | verified_now          | `windows_memory_page_faults_total`                                      | `rate`              | count/sec | Signal pressure quan trong                             |
| memory   | `node.memory_transition_faults_rate` | verified_now          | `windows_memory_transition_faults_total`                                | `rate`              | count/sec | Feature AI bo tro                                      |
| memory   | `node.memory_pages_input_rate`       | optional_by_collector | `windows_memory_pages_input_total`                                      | `rate`              | count/sec | Chua thay tren host hien tai                           |
| memory   | `node.memory_pages_output_rate`      | optional_by_collector | `windows_memory_pages_output_total`                                     | `rate`              | count/sec | Chua thay tren host hien tai                           |

### 7.4. Storage

| Category | Metric Key                   | Status                | Source Metric                                                                   | Aggregation                | Unit      | Notes                        |
| -------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------------- | -------------------------- | --------- | ---------------------------- |
| storage  | `node.disk_free_gb`          | verified_now          | `windows_logical_disk_free_bytes`                                               | `system_drive_bytes_to_gb` | GB        | Uu tien drive he thong       |
| storage  | `node.disk_used_pct`         | verified_now          | `windows_logical_disk_free_bytes`, `windows_logical_disk_size_bytes`            | `system_drive_used_pct`    | %         | Cho canh bao va overlay      |
| storage  | `node.disk_total_bytes`      | verified_now          | `windows_logical_disk_size_bytes`                                               | `system_drive_direct`      | bytes     | Capacity context             |
| storage  | `node.disk_read_bytes_sec`   | verified_now          | `windows_logical_disk_read_bytes_total`                                         | `system_drive_rate`        | bytes/sec | I/O throughput               |
| storage  | `node.disk_write_bytes_sec`  | verified_now          | `windows_logical_disk_write_bytes_total`                                        | `system_drive_rate`        | bytes/sec | I/O throughput               |
| storage  | `node.disk_read_ops_sec`     | verified_now          | `windows_logical_disk_reads_total`                                              | `system_drive_rate`        | ops/sec   | Read IOPS                    |
| storage  | `node.disk_write_ops_sec`    | verified_now          | `windows_logical_disk_writes_total`                                             | `system_drive_rate`        | ops/sec   | Write IOPS                   |
| storage  | `node.disk_read_latency_ms`  | verified_now          | `windows_logical_disk_read_seconds_total`, `windows_logical_disk_reads_total`   | `derive_latency_ms`        | ms        | `seconds / ops * 1000`       |
| storage  | `node.disk_write_latency_ms` | verified_now          | `windows_logical_disk_write_seconds_total`, `windows_logical_disk_writes_total` | `derive_latency_ms`        | ms        | `seconds / ops * 1000`       |
| storage  | `node.disk_queue_length`     | verified_now          | `windows_logical_disk_requests_queued`                                          | `system_drive_direct`      | count     | Signal saturation rat manh   |
| storage  | `node.disk_split_io_rate`    | verified_now          | `windows_logical_disk_split_ios_total`                                          | `system_drive_rate`        | count/sec | Optional cho diagnostics     |
| storage  | `node.pagefile_usage_pct`    | optional_by_collector | `windows_pagefile_usage_pct`                                                    | `direct`                   | %         | Chua thay tren host hien tai |

### 7.5. Network

| Category | Metric Key                         | Status       | Source Metric                                                                                  | Aggregation                      | Unit        | Notes                           |
| -------- | ---------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------- | ----------- | ------------------------------- |
| network  | `node.network_rx_bytes_sec`        | verified_now | `windows_net_bytes_received_total`                                                             | `select_primary_nic_rate`        | bytes/sec   | Qua primary NIC                 |
| network  | `node.network_tx_bytes_sec`        | verified_now | `windows_net_bytes_sent_total`                                                                 | `select_primary_nic_rate`        | bytes/sec   | Qua primary NIC                 |
| network  | `node.network_total_bytes_sec`     | verified_now | `windows_net_bytes_total`                                                                      | `select_primary_nic_rate`        | bytes/sec   | Hoac sum active NIC theo policy |
| network  | `node.network_rx_packets_sec`      | verified_now | `windows_net_packets_received_total`                                                           | `select_primary_nic_rate`        | packets/sec | Packet load                     |
| network  | `node.network_tx_packets_sec`      | verified_now | `windows_net_packets_sent_total`                                                               | `select_primary_nic_rate`        | packets/sec | Packet load                     |
| network  | `node.network_error_count`         | verified_now | `windows_net_packets_received_errors_total`, `windows_net_packets_outbound_errors_total`       | `sum_primary_nic_delta`          | count       | Tong error trong window         |
| network  | `node.network_discard_count`       | verified_now | `windows_net_packets_received_discarded_total`, `windows_net_packets_outbound_discarded_total` | `sum_primary_nic_delta`          | count       | Tong discard trong window       |
| network  | `node.network_output_queue_length` | verified_now | `windows_net_output_queue_length_packets`                                                      | `select_primary_nic_direct`      | count       | Signal congestion               |
| network  | `node.network_bandwidth_bytes`     | verified_now | `windows_net_current_bandwidth_bytes`                                                          | `select_primary_nic_direct`      | bytes       | Capacity context                |
| network  | `node.network_utilization_pct`     | verified_now | `windows_net_bytes_total`, `windows_net_current_bandwidth_bytes`                               | `derive_network_utilization_pct` | %           | Throughput/bandwidth            |
| network  | `node.nic_up_count`                | verified_now | `windows_net_nic_operation_status`                                                             | `count_status:up`                | count       | Inventory tong quan             |
| network  | `node.primary_nic_status`          | verified_now | `windows_net_nic_operation_status`                                                             | `primary_nic_status`             | state       | `up/down/unknown`               |

### 7.6. TCP connection health

| Category              | Metric Key                             | Status       | Source Metric                                                            | Aggregation                  | Unit         | Notes                           |
| --------------------- | -------------------------------------- | ------------ | ------------------------------------------------------------------------ | ---------------------------- | ------------ | ------------------------------- |
| tcp_connection_health | `node.tcp_connections_established`     | verified_now | `windows_tcp_connections_established`                                    | `sum_by:af`                  | count        | Tong IPv4 + IPv6                |
| tcp_connection_health | `node.tcp_connections_listening`       | verified_now | `windows_tcp_connections_state_count`                                    | `sum_where_state:LISTENING`  | count        | Inventory va diagnostics        |
| tcp_connection_health | `node.tcp_connections_close_wait`      | verified_now | `windows_tcp_connections_state_count`                                    | `sum_where_state:CLOSE_WAIT` | count        | Socket leak signal              |
| tcp_connection_health | `node.tcp_connections_time_wait`       | verified_now | `windows_tcp_connections_state_count`                                    | `sum_where_state:TIME_WAIT`  | count        | Connection churn                |
| tcp_connection_health | `node.tcp_connection_failures_rate`    | verified_now | `windows_tcp_connection_failures_total`                                  | `sum_rate_by:af`             | count/sec    | Incident signal                 |
| tcp_connection_health | `node.tcp_connections_reset_rate`      | verified_now | `windows_tcp_connections_reset_total`                                    | `sum_rate_by:af`             | count/sec    | Incident signal                 |
| tcp_connection_health | `node.tcp_segments_retransmitted_rate` | verified_now | `windows_tcp_segments_retransmitted_total`                               | `sum_rate_by:af`             | segments/sec | Quan trong cho predict incident |
| tcp_connection_health | `node.tcp_retransmit_pct`              | verified_now | `windows_tcp_segments_retransmitted_total`, `windows_tcp_segments_total` | `derive_ratio_pct`           | %            | Quality signal                  |
| tcp_connection_health | `node.tcp_active_open_rate`            | verified_now | `windows_tcp_connections_active_total`                                   | `sum_rate_by:af`             | count/sec    | Behavior signal                 |
| tcp_connection_health | `node.tcp_passive_open_rate`           | verified_now | `windows_tcp_connections_passive_total`                                  | `sum_rate_by:af`             | count/sec    | Behavior signal                 |

### 7.7. Runtime and OS

| Category       | Metric Key                     | Status                | Source Metric                               | Aggregation                   | Unit      | Notes                        |
| -------------- | ------------------------------ | --------------------- | ------------------------------------------- | ----------------------------- | --------- | ---------------------------- |
| runtime_and_os | `node.uptime_seconds`          | verified_now          | `windows_system_boot_time_timestamp`        | `derive_uptime`               | seconds   | Cho restart detection        |
| runtime_and_os | `node.boot_time`               | verified_now          | `windows_system_boot_time_timestamp`        | `timestamp_from_unix`         | timestamp | Incident timeline            |
| runtime_and_os | `node.process_count`           | verified_now          | `windows_system_processes`                  | `direct`                      | count     | Runtime pressure             |
| runtime_and_os | `node.thread_count`            | verified_now          | `windows_system_threads`                    | `direct`                      | count     | Runtime pressure             |
| runtime_and_os | `node.context_switch_rate`     | verified_now          | `windows_system_context_switches_total`     | `rate`                        | count/sec | Scheduler signal             |
| runtime_and_os | `node.exception_dispatch_rate` | verified_now          | `windows_system_exception_dispatches_total` | `rate`                        | count/sec | Diagnostics                  |
| runtime_and_os | `node.system_call_rate`        | verified_now          | `windows_system_system_calls_total`         | `rate`                        | count/sec | Optional AI feature          |
| runtime_and_os | `node.service_running_count`   | optional_by_collector | `windows_service_state`                     | `count_service_state:running` | count     | Chua thay tren host hien tai |
| runtime_and_os | `node.service_stopped_count`   | optional_by_collector | `windows_service_state`                     | `count_service_state:stopped` | count     | Chua thay tren host hien tai |

### 7.8. Derived and optional

| Category             | Metric Key                       | Status  | Source Metric                        | Aggregation               | Unit      | Notes                            |
| -------------------- | -------------------------------- | ------- | ------------------------------------ | ------------------------- | --------- | -------------------------------- |
| derived_and_optional | `node.reboot_count_24h`          | derived | `windows_system_boot_time_timestamp` | `derive_reboot_count_24h` | count     | Can persisted state              |
| derived_and_optional | `node.high_cpu_duration_sec`     | derived | `node.cpu_usage_pct`                 | `threshold_duration`      | seconds   | Co the tinh o agent hoac backend |
| derived_and_optional | `node.high_memory_duration_sec`  | derived | `node.memory_used_pct`               | `threshold_duration`      | seconds   | Co the tinh o agent hoac backend |
| derived_and_optional | `node.high_disk_duration_sec`    | derived | `node.disk_used_pct`                 | `threshold_duration`      | seconds   | Co the tinh o agent hoac backend |
| derived_and_optional | `node.packet_error_rate`         | derived | `node.network_error_count`           | `window_rate`             | count/sec | Optional trong agent             |
| derived_and_optional | `node.packet_discard_rate`       | derived | `node.network_discard_count`         | `window_rate`             | count/sec | Optional trong agent             |
| derived_and_optional | `node.health_score`              | derived | nhieu metric node                    | `score_formula`           | score     | Nen de backend tinh o MVP        |
| derived_and_optional | `node.risk_score`                | derived | nhieu metric node                    | `score_formula`           | score     | Nen de backend tinh o MVP        |
| derived_and_optional | `node.incident_likelihood_score` | derived | nhieu metric node                    | `model_output`            | score     | Nen de backend tinh              |

## 8. Mapping rules quan trong cho agent

### 8.1. Chon primary NIC

Agent nen chon `primary NIC` theo thu tu:

1. `assets.yaml.network.primaryNicHint`
2. NIC co `status=up`
3. NIC co `windows_net_bytes_total` lon nhat trong tap NIC active
4. loai tru loopback va mot so virtual adapter neu chua duoc chi dinh ro

Tren host hien tai, context quan sat cho thay:

- `RZ608 Wi-Fi 6E 80MHz` dang la uplink chinh
- `Realtek PCIe GbE Family Controller` dang `down`
- `Radmin VPN` co mat trong `nic_info`, nhung khong co series throughput trong dump hien tai

### 8.2. Chon system drive

Agent nen co quy tac:

1. uu tien drive system do config chi dinh
2. neu khong co, chon drive `C:` neu ton tai
3. neu van khong co, fallback drive co size > 0 va la fixed disk

### 8.3. CPU utilization

Voi `windows_cpu_time_total`, rule nen la:

- tinh rate theo sample window
- lay mode `idle`
- `cpu_usage_pct = 100 - idle_pct`

Can co quy tac ro rang ve series `_Total` hoac per-core.
Cho node-level metric, nen dung tong hop toan host.

### 8.4. Ratio va rate

Agent can co persisted state cho:

- counter delta
- rate per second
- ratio giua 2 counter

Nhung metric bat buoc can state:

- network throughput
- network error/discard rate
- tcp retransmit rate
- tcp connection failure rate
- disk bytes/sec
- disk ops/sec

## 9. MVP mapping bat buoc cho project nay

Neu cat scope de code nhanh nhung van dung context du an, bo mapping bat buoc nen la:

- `node.hostname`
- `node.os_product`
- `node.logical_cpu_count`
- `node.cpu_usage_pct`
- `node.cpu_queue_length`
- `node.memory_available_mb`
- `node.memory_used_pct`
- `node.memory_commit_used_pct`
- `node.disk_free_gb`
- `node.disk_used_pct`
- `node.network_rx_bytes_sec`
- `node.network_tx_bytes_sec`
- `node.primary_nic_status`
- `node.network_utilization_pct`
- `node.tcp_connection_failures_rate`
- `node.tcp_segments_retransmitted_rate`
- `node.tcp_retransmit_pct`
- `node.uptime_seconds`
- `node.process_count`

Bo nay du:

- dashboard node detail
- AR overlay co y nghia van hanh
- anomaly feature set co ban
- predict incident baseline

## 10. Mapping nen de agent tinh, mapping nen de backend tinh

### 10.1. Nen tinh trong agent

Nen de agent tinh:

- `node.uptime_seconds`
- `node.memory_used_pct`
- `node.memory_commit_used_pct`
- `node.disk_used_pct`
- `node.network_rx_bytes_sec`
- `node.network_tx_bytes_sec`
- `node.network_utilization_pct`
- `node.tcp_retransmit_pct`
- `node.primary_nic_status`

Ly do:

- gan raw source
- can counter state local
- giam tai cho backend

### 10.2. Nen de backend tinh

Nen de backend tinh:

- `node.health_score`
- `node.risk_score`
- `node.incident_likelihood_score`
- `node.anomaly_score`
- `node.maintenance_urgency_score`

Ly do:

- can context rong hon
- can nhieu cua so thoi gian
- can doi cong thuc sau nay

## 11. Vi du rule trong `metrics.windows.yaml`

```yaml
metrics:
  - category: compute
    key: node.cpu_usage_pct
    status: verified_now
    sourceMetric: windows_cpu_time_total
    scopeType: node
    unit: "%"
    aggregation: cpu_usage_from_idle
    keepLabels:
      - core

  - category: network
    key: node.network_rx_bytes_sec
    status: verified_now
    sourceMetric: windows_net_bytes_received_total
    scopeType: node
    unit: bytes/sec
    aggregation: select_primary_nic_rate
    keepLabels:
      - nic

  - category: runtime_and_os
    key: node.uptime_seconds
    status: verified_now
    sourceMetric: windows_system_boot_time_timestamp
    scopeType: node
    unit: seconds
    aggregation: derive_uptime
```

## 12. Ket luan

Mapping spec nay chot theo huong:

- dung metric da verify tren `localhost:9182/metrics`
- giu category phu hop voi node metrics cua du an
- tach ro `verified_now`, `optional_by_collector`, va `derived`
- uu tien bo mapping MVP du de phuc vu dashboard, AR, AI, va predict incident

Tai lieu nay la cau noi truc tiep giua:

- `03_config_design.md`
- `metrics.windows.yaml`
- code mapping engine trong Go agent
