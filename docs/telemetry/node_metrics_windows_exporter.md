# Node Metrics Design Based on Windows Exporter

## 1. Muc tieu tai lieu

Tai lieu nay chot huong thiet ke `node metrics` cho he thong PoC AR + AI monitoring va maintenance, theo nguon du lieu chinh la `Windows Exporter` tren endpoint Prometheus metrics, vi du:

- `http://localhost:9182/metrics`

Muc tieu cua tai lieu:

- Xac dinh bo metric chi tiet cho `node/host`.
- Tach ro `raw exporter metrics` va `domain metrics` cua he thong.
- Chot metric nao phuc vu dashboard, AR overlay, anomaly scoring va predictive incident.
- Giam ro roi khi implementation collector, backend ingest va AI feature pipeline.

Tai lieu nay coi:

- `node` = host operating system / laptop / VM / may lab dong vai tro server trong PoC.
- `Windows Exporter` = nguon observed metrics chinh cho host telemetry.
- `service` va `container` la scope rieng, nhung node metrics van can giu du context de support maintenance.

## 2. Tai sao chon Windows Exporter thay vi psutil lam nguon chinh

`Windows Exporter` phu hop hon voi de tai nay vi:

- expose metric theo chuan Prometheus, de ingest va alerting
- co context phong phu hon `psutil`
- co metric theo `core`, `nic`, `tcp state`, `os info`, `boot time`
- de scale cho dashboard, rule engine va AI feature extraction
- de standardize ve sau neu mo rong sang stack quan sat kieu Prometheus/Grafana

`psutil` van co the huu ich nhu:

- fallback provider
- bo sung metric nho neu exporter chua expose
- test local nhanh trong Python

Nhung trong tai lieu nay, `Windows Exporter` la nguon chinh, con `psutil` khong phai baseline.

## 3. Nguyen tac mo hinh metric

### 3.1. Tach 3 lop metric

Nen tach ro 3 lop:

1. `Raw exporter metrics`
   - ten goc tu Windows Exporter
   - vi du `windows_system_processes`

2. `Normalized domain metrics`
   - ten metric on dinh trong he thong
   - vi du `node.process_count`

3. `Derived operational metrics`
   - metric tong hop cho AR, AI, maintenance, incident prediction
   - vi du `node.health_score`, `node.risk_score`, `node.incident_likelihood_score`

### 3.2. Nguyen tac chon metric

Mot metric nen duoc giu lai neu:

- co y nghia van hanh ro rang
- co the hanh dong duoc
- co kha nang tao feature cho AI
- co kha nang hien thi gon tren AR
- co the giai thich duoc cho technician khi maintenance

### 3.3. Nguyen tac thuc te cho PoC

- Uu tien metric de lay that tu exporter.
- Khong bat buoc dua tat ca raw metric vao database.
- Chi luu nhung metric co gia tri dashboard, AI, alerting hoac forensics.
- Metric inventory/meta it thay doi nen luu o metadata store thay vi time-series neu co the.

## 4. Muc tieu nghiep vu cua node metrics trong de tai

Bo node metrics phai ho tro dong thoi 4 muc dich:

### 4.1. Dashboard realtime

- Theo doi tinh trang node
- Hien thi pressure ve CPU, RAM, disk, network
- Hien thi health va risk tong hop

### 4.2. AR maintenance

- Hien thi overlay ngan gon nhung co gia tri
- Giup technician biet node dang gap van de gi
- Cho phep xem canh bao, trend ngan han, va goi y chan doan

### 4.3. AI anomaly scoring

- Lam input cho anomaly detection
- Phat hien pattern bat thuong theo thoi gian
- Lam feature cho risk scoring

### 4.4. Predictive incident

- Uoc luong kha nang node se phat sinh incident trong ngan han
- Su dung trend, pressure, saturation, restart, network fault, packet retransmission, memory pressure

## 5. Nhom metric de xuat cho node

De tranh roi, node metrics duoc chot theo 8 nhom:

1. `identity_and_inventory`
2. `compute`
3. `memory`
4. `storage`
5. `network`
6. `runtime_and_os`
7. `stability_and_incident_signals`
8. `derived_scores`

Nhom `security` chu dong bo qua trong phase hien tai.

## 6. Raw Windows Exporter metrics co lien quan

Nhung metric raw da thay ro tren exporter va rat hop voi huong node:

- `windows_cpu_*`
- `windows_memory_*`
- `windows_net_*`
- `windows_os_info`
- `windows_os_hostname`
- `windows_system_boot_time_timestamp`
- `windows_system_processes`
- `windows_system_threads`
- `windows_system_processor_queue_length`
- `windows_tcp_connections_established`
- `windows_tcp_connections_state_count`
- `windows_tcp_segments_retransmitted_total`
- `windows_tcp_connection_failures_total`

Ngoai ra, tuy collector duoc bat, co the co them:

- `windows_logical_disk_*`
- `windows_disk_*`
- `windows_cs_*`
- `windows_pagefile_*`
- `windows_service_*`
- `windows_process_*`

Tai lieu nay van include cac metric nay trong design vi chung rat phu hop cho node observability.

## 7. Metric catalog chi tiet cho node

Bang duoi day dung cac cot:

- `Metric Key`: ten metric trong he thong
- `Display Name`: ten hien thi
- `Category`: nhom metric
- `Type`: `observed` hoac `derived`
- `Unit`: don vi
- `Windows Exporter Source`: metric goc
- `Transform / Aggregation`: cach map hoac tinh
- `Purpose`: muc dich nghiep vu
- `AR`: co nen hien thi overlay khong
- `AI`: co nen dua vao anomaly/risk/predictive model khong
- `Alert`: co nen dung cho alert rule khong

### 7.1. Identity and inventory metrics

| Metric Key               | Display Name      | Category  | Type     | Unit  | Windows Exporter Source                                       | Transform / Aggregation                        | Purpose                                     | AR  | AI      | Alert |
| ------------------------ | ----------------- | --------- | -------- | ----- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- | --- | ------- | ----- |
| `node.hostname`          | Hostname          | identity  | observed | text  | `windows_os_hostname`                                         | Lay label `hostname` hoac `fqdn`               | Xac dinh node trong dashboard, AR, incident | yes | no      | no    |
| `node.os_product`        | OS Product        | inventory | observed | text  | `windows_os_info`                                             | Lay label `product`                            | Hien thi ngu canh host                      | yes | no      | no    |
| `node.os_version`        | OS Version        | inventory | observed | text  | `windows_os_info`                                             | Hop nhat `version`, `build_number`, `revision` | Debug va inventory                          | no  | partial | no    |
| `node.logical_cpu_count` | Logical CPU Count | inventory | observed | count | `windows_cpu_logical_processor`                               | Lay truc tiep                                  | Capacity context cho CPU analysis           | no  | yes     | no    |
| `node.primary_nic_name`  | Primary NIC Name  | inventory | derived  | text  | `windows_net_nic_operation_status`, `windows_net_bytes_total` | Chon NIC `up` co traffic chinh                 | Xac dinh uplink chinh cho node              | yes | partial | no    |
| `node.primary_ipv4`      | Primary IPv4      | inventory | observed | text  | `windows_net_nic_address_info`                                | Chon IPv4 cua primary NIC                      | Hien thi tren dashboard/AR                  | yes | no      | no    |

### 7.2. Compute metrics

| Metric Key                       | Display Name             | Category | Type     | Unit      | Windows Exporter Source                                              | Transform / Aggregation                            | Purpose                                         | AR  | AI      | Alert   |
| -------------------------------- | ------------------------ | -------- | -------- | --------- | -------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | --- | ------- | ------- |
| `node.cpu_usage_pct`             | CPU Usage                | compute  | observed | %         | `windows_cpu_time_total`                                             | `100 - idle_pct` hoac tong utilization tu cac mode | Metric cot loi de phat hien saturation          | yes | yes     | yes     |
| `node.cpu_user_pct`              | CPU User Time            | compute  | observed | %         | `windows_cpu_time_total`                                             | Rate mode `user`                                   | Hieu workload user space                        | no  | yes     | partial |
| `node.cpu_privileged_pct`        | CPU Kernel Time          | compute  | observed | %         | `windows_cpu_time_total`                                             | Rate mode `privileged`                             | Phat hien kernel pressure, driver issue         | no  | yes     | yes     |
| `node.cpu_interrupt_pct`         | CPU Interrupt Time       | compute  | observed | %         | `windows_cpu_interrupts_total`, `windows_cpu_clock_interrupts_total` | Tinh interrupt rate / tong CPU window              | Phat hien hardware/network interrupt bat thuong | no  | yes     | partial |
| `node.cpu_dpc_rate`              | CPU DPC Rate             | compute  | observed | count/sec | `windows_cpu_dpcs_total`                                             | Rate tong hop theo core                            | Chan doan driver/network issue                  | no  | yes     | partial |
| `node.cpu_queue_length`          | CPU Queue Length         | compute  | observed | count     | `windows_system_processor_queue_length`                              | Lay truc tiep                                      | Doi CPU, signal incident som                    | no  | yes     | yes     |
| `node.cpu_core_frequency_mhz`    | CPU Core Frequency       | compute  | observed | MHz       | `windows_cpu_core_frequency_mhz`                                     | Avg hoac max theo core                             | Capacity context, thermal throttling hint       | no  | partial | no      |
| `node.cpu_parking_core_count`    | Parked Core Count        | compute  | derived  | count     | `windows_cpu_parking_status`                                         | Dem core co gia tri parked                         | Hieu tinh trang power saving                    | no  | partial | no      |
| `node.cpu_cstate_residency_pct`  | CPU Idle State Residency | compute  | observed | %         | `windows_cpu_cstate_seconds_total`                                   | Tinh theo state va cua so thoi gian                | Feature cho workload behavior                   | no  | yes     | no      |
| `node.cpu_performance_ratio_pct` | CPU Performance Ratio    | compute  | observed | %         | `windows_cpu_processor_performance_total`                            | Chuan hoa theo wall time neu co the                | Hieu boost/throttling xu huong                  | no  | yes     | no      |

### 7.3. Memory metrics

| Metric Key                           | Display Name          | Category | Type     | Unit      | Windows Exporter Source                                              | Transform / Aggregation | Purpose                             | AR  | AI      | Alert   |
| ------------------------------------ | --------------------- | -------- | -------- | --------- | -------------------------------------------------------------------- | ----------------------- | ----------------------------------- | --- | ------- | ------- |
| `node.memory_used_pct`               | Memory Usage          | memory   | observed | %         | `windows_memory_available_bytes`, `windows_cs_physical_memory_bytes` | `1 - available/total`   | Metric cot loi cho pressure va leak | yes | yes     | yes     |
| `node.memory_used_bytes`             | Memory Used           | memory   | observed | bytes     | `windows_memory_available_bytes`, `windows_cs_physical_memory_bytes` | `total - available`     | Capacity va feature engineering     | no  | yes     | partial |
| `node.memory_available_mb`           | Available Memory      | memory   | observed | MB        | `windows_memory_available_bytes`                                     | Bytes -> MB             | Ngu canh memory pressure            | yes | yes     | yes     |
| `node.memory_committed_bytes`        | Committed Memory      | memory   | observed | bytes     | `windows_memory_committed_bytes`                                     | Lay truc tiep           | Hieu ap luc commit memory           | no  | yes     | yes     |
| `node.memory_commit_limit_bytes`     | Commit Limit          | memory   | observed | bytes     | `windows_memory_commit_limit`                                        | Lay truc tiep           | Hieu risk het commit                | no  | partial | no      |
| `node.memory_commit_used_pct`        | Commit Usage          | memory   | derived  | %         | `windows_memory_committed_bytes`, `windows_memory_commit_limit`      | `committed/limit * 100` | Pressure signal manh                | no  | yes     | yes     |
| `node.memory_cache_bytes`            | Cache Memory          | memory   | observed | bytes     | `windows_memory_cache_bytes`                                         | Lay truc tiep           | Hieu bo nho cache                   | no  | partial | no      |
| `node.memory_pool_paged_bytes`       | Paged Pool            | memory   | observed | bytes     | `windows_memory_pool_paged_bytes`                                    | Lay truc tiep           | Phat hien kernel memory issue       | no  | yes     | partial |
| `node.memory_pool_nonpaged_bytes`    | Nonpaged Pool         | memory   | observed | bytes     | `windows_memory_pool_nonpaged_bytes`                                 | Lay truc tiep           | Phat hien kernel leak               | no  | yes     | partial |
| `node.memory_page_faults_rate`       | Page Fault Rate       | memory   | observed | count/sec | `windows_memory_page_faults_total`                                   | Rate                    | Chan doan pressure va thrash        | no  | yes     | yes     |
| `node.memory_pages_input_rate`       | Pages Input Rate      | memory   | observed | count/sec | `windows_memory_pages_input_total`                                   | Rate                    | Hieu paging tu disk vao RAM         | no  | yes     | partial |
| `node.memory_pages_output_rate`      | Pages Output Rate     | memory   | observed | count/sec | `windows_memory_pages_output_total`                                  | Rate                    | Hieu paging tu RAM ra disk          | no  | yes     | partial |
| `node.memory_transition_faults_rate` | Transition Fault Rate | memory   | observed | count/sec | `windows_memory_transition_faults_total`                             | Rate                    | Feature AI de phan biet pressure    | no  | yes     | no      |

### 7.4. Storage metrics

| Metric Key                   | Display Name          | Category | Type     | Unit      | Windows Exporter Source                                                            | Transform / Aggregation                        | Purpose                                 | AR  | AI  | Alert   |
| ---------------------------- | --------------------- | -------- | -------- | --------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- | --- | --- | ------- |
| `node.disk_used_pct`         | Disk Usage            | storage  | observed | %         | `windows_logical_disk_free_bytes`, `windows_logical_disk_size_bytes`               | Tong hop theo drive quan trong hoac root drive | Canh bao sap day dia                    | yes | yes | yes     |
| `node.disk_free_gb`          | Disk Free Capacity    | storage  | observed | GB        | `windows_logical_disk_free_bytes`                                                  | Chon drive he thong hoac tong hop              | Capacity planning va triage             | yes | yes | yes     |
| `node.disk_read_bytes_sec`   | Disk Read Throughput  | storage  | observed | bytes/sec | `windows_logical_disk_read_bytes_total` hoac `windows_disk_read_bytes_total`       | Rate                                           | Hieu I/O behavior                       | no  | yes | partial |
| `node.disk_write_bytes_sec`  | Disk Write Throughput | storage  | observed | bytes/sec | `windows_logical_disk_written_bytes_total` hoac `windows_disk_written_bytes_total` | Rate                                           | Hieu I/O behavior                       | no  | yes | partial |
| `node.disk_read_ops_sec`     | Disk Read IOPS        | storage  | observed | ops/sec   | `windows_logical_disk_reads_total` hoac `windows_disk_reads_total`                 | Rate                                           | Feature saturation/storage incident     | no  | yes | no      |
| `node.disk_write_ops_sec`    | Disk Write IOPS       | storage  | observed | ops/sec   | `windows_logical_disk_writes_total` hoac `windows_disk_writes_total`               | Rate                                           | Feature saturation/storage incident     | no  | yes | no      |
| `node.disk_read_latency_ms`  | Disk Read Latency     | storage  | observed | ms        | `windows_logical_disk_read_seconds_total`, `windows_logical_disk_reads_total`      | `read_seconds / reads * 1000`                  | Chan doan storage slowdown              | no  | yes | yes     |
| `node.disk_write_latency_ms` | Disk Write Latency    | storage  | observed | ms        | `windows_logical_disk_write_seconds_total`, `windows_logical_disk_writes_total`    | `write_seconds / writes * 1000`                | Chan doan storage slowdown              | no  | yes | yes     |
| `node.disk_queue_length`     | Disk Queue Length     | storage  | observed | count     | `windows_logical_disk_requests_queued` hoac tu disk collector                      | Lay truc tiep                                  | Signal saturation rat manh              | no  | yes | yes     |
| `node.disk_split_io_rate`    | Split IO Rate         | storage  | observed | count/sec | `windows_logical_disk_split_ios_total`                                             | Rate                                           | Hieu fragmentation / storage stress     | no  | yes | partial |
| `node.pagefile_usage_pct`    | Pagefile Usage        | storage  | observed | %         | `windows_pagefile_usage_pct`                                                       | Lay truc tiep                                  | Nhan dien pressure memory keo sang disk | no  | yes | yes     |

### 7.5. Network metrics

| Metric Key                         | Display Name                | Category | Type     | Unit        | Windows Exporter Source                                                                        | Transform / Aggregation            | Purpose                              | AR  | AI      | Alert   |
| ---------------------------------- | --------------------------- | -------- | -------- | ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ | --- | ------- | ------- |
| `node.network_rx_bytes_sec`        | Network RX Throughput       | network  | observed | bytes/sec   | `windows_net_bytes_received_total`                                                             | Tong hop rate tren NIC dang active | Theo doi traffic vao                 | yes | yes     | partial |
| `node.network_tx_bytes_sec`        | Network TX Throughput       | network  | observed | bytes/sec   | `windows_net_bytes_sent_total`                                                                 | Tong hop rate tren NIC dang active | Theo doi traffic ra                  | yes | yes     | partial |
| `node.network_total_bytes_sec`     | Network Total Throughput    | network  | observed | bytes/sec   | `windows_net_bytes_total`                                                                      | Tong hop rate                      | Signal hoat dong tong                | yes | yes     | no      |
| `node.network_rx_packets_sec`      | Network RX Packets          | network  | observed | packets/sec | `windows_net_packets_received_total`                                                           | Rate                               | Hieu packet load                     | no  | yes     | no      |
| `node.network_tx_packets_sec`      | Network TX Packets          | network  | observed | packets/sec | `windows_net_packets_sent_total`                                                               | Rate                               | Hieu packet load                     | no  | yes     | no      |
| `node.network_error_count`         | Network Error Count         | network  | derived  | count       | `windows_net_packets_received_errors_total`, `windows_net_packets_outbound_errors_total`       | Tong error trong cua so            | Phat hien network issue              | yes | yes     | yes     |
| `node.network_discard_count`       | Network Discard Count       | network  | derived  | count       | `windows_net_packets_received_discarded_total`, `windows_net_packets_outbound_discarded_total` | Tong discard trong cua so          | Hieu packet drop / congestion        | no  | yes     | yes     |
| `node.network_output_queue_length` | Network Output Queue Length | network  | observed | count       | `windows_net_output_queue_length_packets`                                                      | Max hoac avg tren primary NIC      | Signal congestion                    | no  | yes     | partial |
| `node.network_bandwidth_bytes`     | NIC Bandwidth               | network  | observed | bytes       | `windows_net_current_bandwidth_bytes`                                                          | Lay tu primary NIC                 | Capacity context de tinh utilization | no  | partial | no      |
| `node.network_utilization_pct`     | Network Utilization         | network  | derived  | %           | `windows_net_bytes_total`, `windows_net_current_bandwidth_bytes`                               | `throughput/bandwidth * 100`       | Hieu muc do sat duong truyen         | yes | yes     | yes     |
| `node.nic_up_count`                | NIC Up Count                | network  | derived  | count       | `windows_net_nic_operation_status`                                                             | Dem NIC co status `up`             | Hieu kha nang ket noi hien tai       | no  | partial | no      |
| `node.primary_nic_status`          | Primary NIC Status          | network  | derived  | state       | `windows_net_nic_operation_status`                                                             | Chon primary NIC roi map `up/down` | Overlay AR, incident context         | yes | yes     | yes     |

### 7.6. TCP and connection health metrics

| Metric Key                             | Display Name                | Category | Type     | Unit         | Windows Exporter Source                                                  | Transform / Aggregation     | Purpose                                | AR  | AI      | Alert   |
| -------------------------------------- | --------------------------- | -------- | -------- | ------------ | ------------------------------------------------------------------------ | --------------------------- | -------------------------------------- | --- | ------- | ------- |
| `node.tcp_connections_established`     | Established TCP Connections | network  | observed | count        | `windows_tcp_connections_established`                                    | Tong hop ipv4 + ipv6        | Hieu muc do phien dang mo              | no  | yes     | no      |
| `node.tcp_connections_listening`       | Listening TCP Connections   | network  | observed | count        | `windows_tcp_connections_state_count`                                    | Loc `LISTENING`             | Inventory va diagnostics               | no  | partial | no      |
| `node.tcp_connections_close_wait`      | Close Wait TCP Connections  | network  | observed | count        | `windows_tcp_connections_state_count`                                    | Loc `CLOSE_WAIT`            | Hieu application socket leak           | no  | yes     | partial |
| `node.tcp_connections_time_wait`       | Time Wait TCP Connections   | network  | observed | count        | `windows_tcp_connections_state_count`                                    | Loc `TIME_WAIT`             | Chan doan churn ket noi                | no  | yes     | no      |
| `node.tcp_connection_failures_rate`    | TCP Connection Failure Rate | network  | observed | count/sec    | `windows_tcp_connection_failures_total`                                  | Rate                        | Signal service/network instability     | no  | yes     | yes     |
| `node.tcp_connections_reset_rate`      | TCP Reset Rate              | network  | observed | count/sec    | `windows_tcp_connections_reset_total`                                    | Rate                        | Hieu reset bat thuong                  | no  | yes     | yes     |
| `node.tcp_segments_retransmitted_rate` | TCP Retransmit Rate         | network  | observed | segments/sec | `windows_tcp_segments_retransmitted_total`                               | Rate                        | Feature manh cho du doan incident mang | no  | yes     | yes     |
| `node.tcp_retransmit_pct`              | TCP Retransmit Ratio        | network  | derived  | %            | `windows_tcp_segments_retransmitted_total`, `windows_tcp_segments_total` | `retransmitted/total * 100` | Chat luong network                     | yes | yes     | yes     |
| `node.tcp_active_open_rate`            | TCP Active Open Rate        | network  | observed | count/sec    | `windows_tcp_connections_active_total`                                   | Rate                        | Hieu node chu dong mo ket noi          | no  | yes     | no      |
| `node.tcp_passive_open_rate`           | TCP Passive Open Rate       | network  | observed | count/sec    | `windows_tcp_connections_passive_total`                                  | Rate                        | Hieu node nhan ket noi                 | no  | yes     | no      |

### 7.7. Runtime and OS metrics

| Metric Key                     | Display Name            | Category | Type     | Unit      | Windows Exporter Source                     | Transform / Aggregation     | Purpose                                  | AR  | AI      | Alert   |
| ------------------------------ | ----------------------- | -------- | -------- | --------- | ------------------------------------------- | --------------------------- | ---------------------------------------- | --- | ------- | ------- |
| `node.uptime_seconds`          | Uptime                  | runtime  | observed | seconds   | `windows_system_boot_time_timestamp`        | `now - boot_time`           | Phat hien restart bat thuong             | yes | yes     | yes     |
| `node.boot_time`               | Boot Time               | runtime  | observed | timestamp | `windows_system_boot_time_timestamp`        | Chuyen thanh timestamp      | Incident timeline                        | no  | partial | no      |
| `node.process_count`           | Process Count           | runtime  | observed | count     | `windows_system_processes`                  | Lay truc tiep               | Hieu activity va leak process            | yes | yes     | partial |
| `node.thread_count`            | Thread Count            | runtime  | observed | count     | `windows_system_threads`                    | Lay truc tiep               | Hieu pressure he thong                   | no  | yes     | no      |
| `node.context_switch_rate`     | Context Switch Rate     | runtime  | observed | count/sec | `windows_system_context_switches_total`     | Rate                        | Signal CPU scheduling pressure           | no  | yes     | partial |
| `node.exception_dispatch_rate` | Exception Dispatch Rate | runtime  | observed | count/sec | `windows_system_exception_dispatches_total` | Rate                        | Hieu ung dung/driver issue               | no  | yes     | partial |
| `node.system_call_rate`        | System Call Rate        | runtime  | observed | count/sec | `windows_system_system_calls_total`         | Rate                        | Feature low-level behavior               | no  | yes     | no      |
| `node.service_running_count`   | Running Service Count   | runtime  | observed | count     | `windows_service_state` neu collector bat   | Dem service state `running` | Inventory va health context              | no  | partial | no      |
| `node.service_stopped_count`   | Stopped Service Count   | runtime  | observed | count     | `windows_service_state` neu collector bat   | Dem service state `stopped` | Hieu host dang co bao nhieu service dung | no  | partial | partial |

### 7.8. Stability and incident-signal metrics

| Metric Key                              | Display Name                  | Category  | Type    | Unit      | Windows Exporter Source                                | Transform / Aggregation                      | Purpose                                 | AR  | AI  | Alert |
| --------------------------------------- | ----------------------------- | --------- | ------- | --------- | ------------------------------------------------------ | -------------------------------------------- | --------------------------------------- | --- | --- | ----- |
| `node.reboot_count_24h`                 | Reboot Count 24h              | stability | derived | count     | `windows_system_boot_time_timestamp` + persisted state | Dem so lan boot lai trong 24h                | Signal node khong on dinh               | yes | yes | yes   |
| `node.high_cpu_duration_sec`            | High CPU Duration             | stability | derived | seconds   | `node.cpu_usage_pct`                                   | Tong thoi gian > nguong                      | Alerting va predictive feature          | no  | yes | yes   |
| `node.high_memory_duration_sec`         | High Memory Duration          | stability | derived | seconds   | `node.memory_used_pct`                                 | Tong thoi gian > nguong                      | Alerting va predictive feature          | no  | yes | yes   |
| `node.high_disk_duration_sec`           | High Disk Duration            | stability | derived | seconds   | `node.disk_used_pct`                                   | Tong thoi gian > nguong                      | Alerting va predictive feature          | no  | yes | yes   |
| `node.packet_error_rate`                | Packet Error Rate             | stability | derived | count/sec | `node.network_error_count`                             | Chuan hoa theo window                        | Signal network issue                    | no  | yes | yes   |
| `node.packet_discard_rate`              | Packet Discard Rate           | stability | derived | count/sec | `node.network_discard_count`                           | Chuan hoa theo window                        | Signal congestion                       | no  | yes | yes   |
| `node.resource_pressure_event_count_1h` | Resource Pressure Events 1h   | stability | derived | count     | Nhieu metric node                                      | Dem so lan vuot nguong CPU/RAM/disk/pagefile | Hieu muc do stress tich luy             | no  | yes | yes   |
| `node.multi_signal_anomaly_count_1h`    | Multi-signal Anomaly Count 1h | stability | derived | count     | Node metric stream + anomaly engine                    | Dem so anomalous windows                     | Triaging va prediction                  | yes | yes | yes   |
| `node.consecutive_degraded_windows`     | Consecutive Degraded Windows  | stability | derived | count     | Node score stream                                      | Dem so cua so lien tiep duoi nguong          | Feature rat tot cho incident prediction | yes | yes | yes   |

### 7.9. Derived scores for AR, AI, and predictive incident

| Metric Key                       | Display Name              | Category | Type    | Unit  | Windows Exporter Source                             | Transform / Aggregation            | Purpose                            | AR  | AI  | Alert   |
| -------------------------------- | ------------------------- | -------- | ------- | ----- | --------------------------------------------------- | ---------------------------------- | ---------------------------------- | --- | --- | ------- |
| `node.health_score`              | Node Health Score         | scoring  | derived | score | Tong hop nhieu metric node                          | Thang 0-100                        | Metric chinh cho dashboard va AR   | yes | yes | yes     |
| `node.risk_score`                | Node Risk Score           | scoring  | derived | score | Tong hop trend, anomaly, alert severity             | Thang 0-100                        | Uu tien xu ly maintenance          | yes | yes | yes     |
| `node.incident_likelihood_score` | Incident Likelihood Score | scoring  | derived | score | Tong hop pressure + trend + signal mang + stability | Xac suat tuong doi 0-100           | Predict incident gan han           | yes | yes | yes     |
| `node.anomaly_score`             | Anomaly Score             | scoring  | derived | score | Model output                                        | Diem anomaly theo cua so telemetry | Lam giau dashboard va AR           | yes | yes | partial |
| `node.maintenance_urgency_score` | Maintenance Urgency       | scoring  | derived | score | Tong hop risk, alert, uptime, degradations          | Thang 0-100                        | Uu tien technician tai hien truong | yes | yes | yes     |
| `node.overlay_severity`          | Overlay Severity          | scoring  | derived | state | Tong hop score va alert                             | `normal`, `warning`, `critical`    | Render mau overlay AR              | yes | no  | yes     |

## 8. Metric uu tien theo muc dich su dung

### 8.1. Uu tien cho dashboard realtime

Nen co toi thieu:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.memory_available_mb`
- `node.disk_used_pct`
- `node.disk_free_gb`
- `node.network_rx_bytes_sec`
- `node.network_tx_bytes_sec`
- `node.primary_nic_status`
- `node.uptime_seconds`
- `node.process_count`
- `node.health_score`
- `node.risk_score`

### 8.2. Uu tien cho AR overlay

Nen hien thi gon, de technician doc nhanh:

- `node.hostname`
- `node.primary_ipv4`
- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `node.primary_nic_status`
- `node.tcp_retransmit_pct`
- `node.health_score`
- `node.risk_score`
- `node.incident_likelihood_score`
- `node.overlay_severity`

### 8.3. Uu tien cho AI anomaly scoring

Nen dua vao feature set:

- `node.cpu_usage_pct`
- `node.cpu_queue_length`
- `node.memory_used_pct`
- `node.memory_commit_used_pct`
- `node.memory_page_faults_rate`
- `node.disk_used_pct`
- `node.disk_read_latency_ms`
- `node.disk_write_latency_ms`
- `node.disk_queue_length`
- `node.network_rx_bytes_sec`
- `node.network_tx_bytes_sec`
- `node.network_utilization_pct`
- `node.tcp_connection_failures_rate`
- `node.tcp_segments_retransmitted_rate`
- `node.process_count`
- `node.context_switch_rate`

### 8.4. Uu tien cho predictive incident

Nen uu tien feature co tinh xu huong:

- rolling avg 1m, 5m, 15m cua CPU, memory, disk, network
- rolling stddev cua CPU, memory, network
- slope cua `memory_used_pct`
- slope cua `disk_free_gb`
- duration cua high CPU / high memory / high disk
- `tcp_retransmit_pct`
- `tcp_connection_failures_rate`
- `packet_error_rate`
- `consecutive_degraded_windows`
- `reboot_count_24h`
- `multi_signal_anomaly_count_1h`

## 9. Metric nao nen la raw, metric nao nen derived

### 9.1. Nen ingest raw

Nen ingest hoac scrape cac metric raw/near-raw sau:

- CPU usage va CPU mode rates
- memory available/used/commit/page fault
- disk free/used/latency/queue
- network rx/tx/error/discard
- TCP established/failure/reset/retransmit
- uptime
- process count
- thread count

### 9.2. Nen derive trong backend hoac collector pipeline

Nen derive:

- `node.primary_nic_name`
- `node.primary_ipv4`
- `node.network_utilization_pct`
- `node.memory_commit_used_pct`
- `node.tcp_retransmit_pct`
- `node.reboot_count_24h`
- `node.health_score`
- `node.risk_score`
- `node.incident_likelihood_score`
- `node.maintenance_urgency_score`
- `node.overlay_severity`

## 10. Giao dien AR nen dung metric nhu the nao

### 10.1. Overlay muc co ban

Overlay level 1 nen ngan:

- Hostname
- CPU
- RAM
- Disk
- NIC status
- Health score
- Risk score

### 10.2. Overlay chan doan

Khi technician tap vao node, hien them:

- uptime
- primary IP
- TCP retransmit ratio
- packet error/discard
- disk latency
- process count
- anomaly score
- incident likelihood

### 10.3. Overlay huong dan maintenance

Co the map theo rule:

- CPU cao + queue cao -> kiem tra process/service nong
- memory cao + page faults cao + pagefile cao -> nghi memory pressure/leak
- disk latency cao + queue cao -> nghi storage bottleneck
- retransmit cao + packet error/discard cao -> nghi network issue
- reboot gan day + anomaly score cao -> uu tien inspection

## 11. Giai thuat goi y cho node health score

Co the bat dau tu `100` va tru diem:

- CPU > 85% trong 3 mau lien tiep: `-15`
- CPU queue length > 2 trong 3 mau: `-10`
- Memory > 85%: `-15`
- Commit usage > 90%: `-10`
- Disk > 90%: `-20`
- Disk latency > nguong: `-10`
- Primary NIC down: `-25`
- TCP retransmit ratio > nguong: `-10`
- Packet errors/discards > nguong: `-10`
- Reboot trong 24h: `-15`

Chan duoi tai `0`.

## 12. Giai thuat goi y cho node risk score

`node.risk_score` nen co tinh du bao hon `health_score`.

Goi y thanh phan:

- 30% current pressure
  - CPU, memory, disk, network utilization
- 25% stability
  - reboot count, degraded windows, pressure event count
- 20% network quality
  - retransmit, connection failures, packet errors
- 15% anomaly
  - model anomaly score
- 10% trend
  - slope memory, slope disk free, slope latency

## 13. Giai thuat goi y cho incident likelihood

`node.incident_likelihood_score` co the dung cho bai toan du doan incident gan han, vi du 15-30 phut toi.

Feature de xuat:

- rolling mean cua CPU, memory, disk latency, retransmit
- rolling stddev cua CPU, network
- slope memory used
- slope disk free
- count cua windows co `health_score < 70`
- count cua windows anomaly
- reboot trong 24h
- queue length cua CPU va disk
- packet error/discard bursts

Model co the bat dau don gian:

- logistic regression
- random forest
- xgboost neu can

Neu chua co label incident that, co the:

- tao incident tu simulation faults
- label event khi alert nghiem trong mo incident record

## 14. Collection frequency de xuat

### 14.1. Nhanh `5s`

- CPU metrics
- memory metrics cot loi
- network throughput
- TCP retransmit / failures
- process count

### 14.2. Trung binh `15s`

- disk usage
- disk latency
- queue length
- health score
- risk score
- anomaly score

### 14.3. Cham `30s`

- os info
- inventory
- primary IPv4
- service running count

### 14.4. Cua so AI / prediction

Nen giu:

- raw samples 5s
- aggregate 1m
- aggregate 5m
- feature windows 15m

## 15. Luu y implementation voi Windows Exporter

### 15.1. Khong nen luu moi metric raw khong can thiet

`windows_exporter` expose rat nhieu metric. Backend khong nen nuot tat ca mot cach mu quang.

Nen co:

- allowlist metric can ingest
- layer mapping raw -> domain
- layer derive domain -> scoring

### 15.2. Can xac dinh primary NIC

Windows host co the co nhieu NIC:

- Wi-Fi
- Ethernet
- VPN
- loopback
- virtual adapters

Nen co rule chon `primary_nic` ro rang, neu khong node-level network metric se bi nhieu.

### 15.3. Disk can tach root drive va aggregate

Nen luu ca:

- metric cho drive he thong
- metric tong hop toan node

Vi AR maintenance thuong can biet "drive nao sap day", khong chi tong host.

### 15.4. Service metrics khong nen nhoi vao node metrics

Node metrics la host-level.
Service health va container health nen la scope rieng.
Nhung node score co the enrich tu alert/service critical state neu can.

## 16. De xuat schema normalized metric

Moi metric sau khi normalize nen co envelope chung:

```json
{
  "metricKey": "node.cpu_usage_pct",
  "scopeType": "node",
  "scopeId": "node-host-01",
  "nodeId": "node-host-01",
  "rackId": "rack-a1",
  "switchId": "sw-a1",
  "value": 73.4,
  "unit": "%",
  "timestamp": "2026-05-27T10:30:00Z",
  "source": "windows_exporter",
  "sourceMetric": "windows_cpu_time_total",
  "tags": {
    "site": "lab-local",
    "environment": "poc",
    "hostname": "MSI",
    "primaryNic": "RZ608 Wi-Fi 6E 80MHz"
  }
}
```

## 17. Node metrics backlog theo phase

### 17.1. Phase 1

- CPU usage
- memory used/available
- disk used/free
- network rx/tx
- uptime
- process count
- primary NIC status
- health score

### 17.2. Phase 2

- disk latency
- disk queue
- commit usage
- page faults
- TCP retransmit
- connection failures
- risk score
- anomaly score

### 17.3. Phase 3

- incident likelihood score
- maintenance urgency score
- degraded windows
- resource pressure event counts
- richer predictive features

## 18. Ket luan

Huong dung `Windows Exporter` cho `node metrics` la rat hop voi de tai nay vi no vua co metric co ban cho monitoring, vua co metric sau hon cho AR diagnostics, anomaly scoring va predictive incident.

Neu can chot scope implementation:

- bat dau bang `compute + memory + storage + network + runtime`
- derive them `health_score`, `risk_score`, `incident_likelihood_score`
- giu service/container la scope rieng
- dung `Windows Exporter` lam ground truth observed layer

Tai lieu nay nen duoc xem la baseline cho:

- collector allowlist
- backend metric normalization
- dashboard node detail
- AR overlay design
- AI feature engineering cho anomaly va predict incident
