# Telemetry Metrics Catalog

## 1. Muc tieu tai lieu

Tài liệu này mô tả bộ telemetry metrics để sử dụng cho hệ thống PoC AR + AI giám sát và bảo trì hạ tầng mô phỏng. Mục tiêu của tài liệu:

- Xác định metric nào cần thu thập.
- Cho biết metric thuộc phạm vi nào: `rack`, `switch`, `switch_port`, `node`, `interface`, `service`, `container`, `ipam`, `operations`.
- Giải thích metric dùng để làm gì: dashboard, alerting, AI scoring, AR overlay, reporting.
- Phân biệt metric nào có thể lấy trực tiếp từ máy local, metric nào cần mô phỏng hoặc enrich từ metadata.
- Gợi ý cách triển khai collector, lưu trữ và pipeline xử lý.

## 2. Nguyen tac mo hinh telemetry

### 2.0. Glossary va mapping (DCIM -> PoC)

Tai lieu nay dung tu theo 2 the gioi:

- DCIM (kieu NetBox): quan ly tai san vat ly, rack, thiet bi.
- Monitoring/Observability: theo doi app, workload, runtime.

De tranh nham lan, chot quy uoc:

- `rack` = nhom topology/mo phong chua nhieu thiet bi (PoC: rack ao, khong dong nhat voi laptop).
- `switch` = network asset trong rack, giu port/uplink context cua mini data center.
- `node` = thiet bi tinh toan (server theo nghia DCIM) (PoC: laptop host, VM, WSL instance, may khac trong lab).
- `service` = ung dung/chuc nang van hanh (API, worker, ingest, db) chay tren node.
- `container` = don vi runtime trien khai (Docker container) co the chua mot service.

Bang mapping goi y:

| Khai niem | Trong DCIM | Trong PoC (Scope) | Identity (goi y) | Vi du |
| --- | --- | --- | --- | --- |
| Rack | Rack | `rack` | `rack_id` | `rack-a1` (rack ao) |
| Switch | Network device | `switch` | `switch_id` | `sw-a1` |
| Server | Device | `node` | `node_id` | `node-host-01` (laptop Windows host) |
| Port/NIC | Interface | `interface` | `interface_id` | `Wi-Fi`, `Ethernet`, `Radmin VPN` |
| App | N/A | `service` | `service_id` | `backend-api`, `telemetry-ingest` |
| Container | N/A | `container` | `container_id` | `docker://abc123` |
| IP/Prefix | IPAM | `ipam` | `ip_id`/`prefix_id` | `10.87.18.193/17` |

Quy tac nhin nhanh:

- Neu ban dang hoi "server" trong rack la cai gi: trong PoC no tuong ung voi `node`.
- `rack` khong phai laptop; `rack` la lop topology, con laptop thuong dong vai `node`.
- `switch` la network asset de mini DC co "chat" hon, nhung hien tai moi chi chot nhung behavior toi thieu.
- `service` khong phai server; no la app chay tren server/node.
- `container` khong phai service; no la cach dong goi trien khai service.

### 2.1. Cach hieu trong PoC

Do chưa có hạ tầng DCIM thật, có thể mô phỏng theo quy ước:

- `rack`: một rack ảo trong topology, có thể chứa switch, node và workload context.
- `switch`: network asset mô phỏng hoặc bán-mô phỏng, có uplink và port context.
- `node`: host operating system (server trong PoC) hoặc một VM/instance tính toán bên trong rack.
- `interface`: card mạng, adapter VPN, Wi-Fi, Ethernet.
- `service`: ứng dụng/chức năng vận hành (API, worker, collector). Có thể chạy dạng Windows service, process, hoặc trong container.
- `container`: Docker container nếu có sử dụng.
- `ipam`: dữ liệu địa chỉ IP, subnet, prefix, interface binding
- `operations`: alert, incident, ticket, collector, ingestion pipeline.

### 2.2. Phân loại metric

- `Observed metric`: lấy được trực tiếp từ hệ điều hành, runtime hoặc agent.
- `Derived metric`: tính toán từ metric gốc, ví dụ `health_score`, `utilization_pct`.
- `Modeled metric`: metadata khai báo hoặc mô phỏng, ví dụ `rack_u_capacity`, `power_feed_name`.

### 2.3. Tiêu chí thiết kế metric

Mỗi metric nên có:

- Tên ổn định, dễ đặt API/schema.
- Đơn vị rõ ràng.
- Scope rõ ràng.
- Tần suất thu thập hợp lý.
- Mục đích nghiệp vụ rõ ràng.
- Khả năng dùng cho alerting và AI enrichment.

## 3. Cấu trúc bảng metric catalog

Bảng metric catalog trong tài liệu này sử dụng các cột sau:

| Cột                          | Ý nghĩa                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `Metric Key`                 | Định danh kỹ thuật của metric, dùng cho schema và API                    |
| `Display Name`               | Tên hiển thị trên dashboard/báo cáo                                      |
| `Scope`                      | Đối tượng metric gắn vào, ví dụ `rack`, `switch`, `switch_port`, `node`, `interface`, `service` |
| `Category`                   | Nhóm chức năng, ví dụ `performance`, `network`, `capacity`, `operations` |
| `Type`                       | `observed`, `derived`, hoặc `modeled`                                    |
| `Unit`                       | Đơn vị đo, ví dụ `%`, `ms`, `bytes/sec`, `count`, `state`                |
| `Description`                | Metric đo lường điều gì                                                  |
| `Purpose`                    | Metric được dùng để làm gì trong hệ thống                                |
| `Source / Collection Method` | Nguồn lấy dữ liệu hoặc cách tính                                         |
| `Collection Frequency`       | Tần suất lấy, ví dụ `5s`, `15s`, `1m`, `event-driven`                    |
| `Alert Candidate`            | Metric có nên dùng cho alert rule hay không                              |
| `AI / Scoring Use`           | Metric có nên đưa vào anomaly, health score, risk score hay không        |
| `AR Overlay Use`             | Metric có cần hiển thị trong AR hay không                                |
| `Availability in Local PoC`  | `yes`, `partial`, `modeled`, `no`                                        |
| `Notes`                      | Ghi chú bổ sung, ràng buộc, cách mô phỏng                                |

## 4. Metric catalog theo scope

## 4.1. Rack metrics

| Metric Key                      | Display Name              | Scope | Category     | Type     | Unit    | Description                            | Purpose                                          | Source / Collection Method                               | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                                       |
| ------------------------------- | ------------------------- | ----- | ------------ | -------- | ------- | -------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | ------------------------------------------- |
| `rack.status`                   | Rack Status               | rack  | availability | derived  | state   | Trang thai tong quan cua rack          | Hien thi suc khoe tong quan va mau trang thai    | Tong hop tu node online, service health, alert state     | 15s                  | yes             | yes              | yes            | partial                   | Co the map tu host online/offline           |
| `rack.health_score`             | Rack Health Score         | rack  | scoring      | derived  | score   | Diem suc khoe tong hop cua rack        | Dashboard tong quan, sap xep uu tien, AR overlay | Tinh tu CPU, memory, disk, service, network, alert       | 15s                  | yes             | yes              | yes            | partial                   | Nen dat thang diem 0-100                    |
| `rack.alert_open_count`         | Open Alert Count          | rack  | operations   | derived  | count   | So alert dang mo lien quan den rack    | Hien thi muc do van de va triage                 | Dem alert theo rack_id                                   | 15s                  | yes             | yes              | yes            | yes                       | De dung cho card overview                   |
| `rack.workload_count`           | Workload Count            | rack  | inventory    | derived  | count   | So service/container duoc gan vao rack | Hieu mat do van hanh trong rack                  | Dem service/container thuoc node trong rack              | 1m                   | no              | partial          | yes            | yes                       | Co the hien thi tren topology               |
| `rack.network_uplink_status`    | Uplink Status             | rack  | network      | derived  | state   | Trang thai uplink cua rack             | Xac dinh rack bi co lap mang hay khong           | Tong hop tu interface chinh cua host                     | 15s                  | yes             | yes              | yes            | partial                   | Can danh dau interface nao la uplink chinh  |
| `rack.power_state`              | Rack Power State          | rack  | power        | derived  | state   | Trang thai nguon cua rack              | Phuc vu demo power issue                         | Suy ra tu AC plugged-in, battery charging, hoac mo phong | 30s                  | yes             | partial          | yes            | partial                   | Neu may ban la laptop thi co the lay tu pin |
| `rack.temperature_c`            | Rack Temperature          | rack  | environment  | observed | celsius | Nhiet do rack                          | Mo phong dieu kien nhiet trong data center       | Sensor local neu co, neu khong thi mo phong              | 30s                  | yes             | yes              | yes            | partial                   | Thuong can mo phong trong PoC               |
| `rack.capacity_utilization_pct` | Rack Capacity Utilization | rack  | capacity     | derived  | %       | Muc su dung cong suat logic cua rack   | Minh hoa kha nang quy hoach suc chua             | Tinh tu so node/workload so voi capacity khai bao        | 1m                   | no              | partial          | no             | modeled                   | Khong phai capacity vat ly that             |
| `rack.u_capacity`               | Rack Unit Capacity        | rack  | capacity     | modeled  | U       | Tong so U cua rack                     | Metadata DCIM                                    | Khai bao thu cong                                        | on-change            | no              | no               | no             | modeled                   | Nen dung de giu chat DCIM                   |
| `rack.u_used`                   | Rack Unit Used            | rack  | capacity     | modeled  | U       | So U da su dung                        | Minh hoa DCIM va rack occupancy                  | Khai bao hoac tinh tu thiet bi gan vao                   | on-change            | no              | no               | yes            | modeled                   | PoC nen de la metadata                      |

## 4.2. Switch va switch port metrics

### 4.2.1. Ghi chu pham vi

`Switch` la thanh phan duoc giu lai co chu dich de mini data center van co network topology hop ly. Trong giai doan hien tai:

- Da xac nhan: `switch` can co metadata, uplink, port status, connected node context, alert context.
- Dang research them: VLAN, STP, LACP, SNMP inventory day du, MAC table, routing behavior.

Nghia la trong PoC, `switch` khong bat buoc la thiet bi that, nhung can co du "behavior toi thieu" de dashboard, simulation va AR co y nghia van hanh.

| Metric Key | Display Name | Scope | Category | Type | Unit | Description | Purpose | Source / Collection Method | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `switch.status` | Switch Status | switch | availability | derived | state | Trang thai tong quan cua switch | Hien thi switch co on dinh hay khong | Tong hop uplink, port, node connectivity | 15s | yes | yes | yes | modeled | Co the derive duoc du cho PoC |
| `switch.health_score` | Switch Health Score | switch | scoring | derived | score | Diem suc khoe tong hop cua switch | Dashboard topology va triage | Tinh tu uplink, port down, error, flap | 15s | yes | yes | yes | modeled | Nen dat thang diem 0-100 |
| `switch.uplink_status` | Switch Uplink Status | switch | network | derived | state | Trang thai uplink chinh cua switch | Phat hien switch bi co lap | Probe uplink, route, hoac simulation state | 10s | yes | yes | yes | partial | Co the mo phong neu chua co thiet bi that |
| `switch.connected_node_count` | Connected Node Count | switch | inventory | derived | count | So node dang noi vao switch | Hieu pham vi switch quan ly | Dem port co asset mapping | 30s | no | partial | no | modeled | Huu ich cho topology view |
| `switch.active_port_count` | Active Port Count | switch | inventory | derived | count | So port dang up | Hieu mat do su dung switch | Dem `switch_port.status=up` | 30s | no | partial | no | modeled | Huu ich cho dashboard summary |
| `switch.alert_open_count` | Switch Open Alert Count | switch | operations | derived | count | So alert dang mo cua switch | Triage network issue | Dem alert theo `switch_id` | 15s | yes | yes | yes | yes | Co the enrich tu alert store |
| `switch_port.status` | Switch Port Status | switch_port | connectivity | modeled | state | Trang thai port `up/down` | Phat hien mat ket noi node qua switch | Mapping port + probe/simulation state | 10s | yes | yes | yes | modeled | Day la metric toi thieu quan trong nhat |
| `switch_port.link_speed_mbps` | Switch Port Link Speed | switch_port | connectivity | modeled | Mbps | Toc do lien ket cua port | Biet node dang noi o muc speed nao | Metadata port hoac simulate | 30s | no | partial | no | modeled | Co the fix cung trong PoC |
| `switch_port.rx_bytes_sec` | Switch Port RX Throughput | switch_port | network | derived | bytes/sec | Luu luong nhan cua port switch | Theo doi traffic tren duong noi | Suy ra tu traffic node/interface lien ket | 5s | yes | yes | no | partial | Neu khong co switch that thi derive tu node |
| `switch_port.tx_bytes_sec` | Switch Port TX Throughput | switch_port | network | derived | bytes/sec | Luu luong gui cua port switch | Theo doi traffic tren duong noi | Suy ra tu traffic node/interface lien ket | 5s | yes | yes | no | partial | Thuong doi xung voi RX |
| `switch_port.error_count` | Switch Port Error Count | switch_port | network | derived | count | So loi tren port switch | Phat hien van de network layer 2/3 | Simulation hoac enrich tu node interface errors | 15s | yes | yes | no | modeled | Dang research cach derive tot nhat |
| `switch_port.flap_count_1h` | Switch Port Flap Count | switch_port | connectivity | derived | count | So lan port doi trang thai trong 1 gio | Phat hien ket noi bat on dinh | Dem su kien up/down | 1m | yes | yes | no | modeled | Rat hop cho fault injection |
| `switch_port.connected_asset` | Connected Asset | switch_port | inventory | modeled | text | Asset dang noi vao port | Topology va AR context | Metadata topology | on-change | no | no | yes | modeled | Vi du `node-host-01` |

## 4.3. Node metrics

| Metric Key                     | Display Name          | Scope | Category     | Type     | Unit      | Description                         | Purpose                              | Source / Collection Method                 | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                                       |
| ------------------------------ | --------------------- | ----- | ------------ | -------- | --------- | ----------------------------------- | ------------------------------------ | ------------------------------------------ | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | ------------------------------------------- |
| `node.cpu_usage_pct`           | CPU Usage             | node  | performance  | observed | %         | Muc su dung CPU hien tai            | Theo doi tai, phat hien CPU spike    | Performance counter / OS API               | 5s                   | yes             | yes              | yes            | yes                       | Metric cot loi cho FR-14                    |
| `node.memory_used_pct`         | Memory Usage          | node  | performance  | observed | %         | Ty le RAM dang su dung              | Phat hien memory pressure va leak    | Tong RAM va RAM con trong                  | 5s                   | yes             | yes              | yes            | yes                       | Nen luu ca used va available                |
| `node.memory_available_mb`     | Available Memory      | node  | performance  | observed | MB        | Luong RAM kha dung                  | Hieu ngu canh memory pressure        | Performance counter / OS API               | 5s                   | yes             | yes              | no             | yes                       | Dung bo tro cho memory_used_pct             |
| `node.disk_used_pct`           | Disk Usage            | node  | storage      | observed | %         | Ty le dung luong luu tru da su dung | Canh bao sap day dia                 | Logical disk counter                       | 15s                  | yes             | yes              | yes            | yes                       | Co the tach theo tung o dia                 |
| `node.disk_free_gb`            | Free Disk Capacity    | node  | storage      | observed | GB        | Dung luong trong con lai            | Capacity planning va canh bao        | Logical disk info                          | 15s                  | yes             | yes              | no             | yes                       | Nen co cho drive system                     |
| `node.network_total_bytes_sec` | Network Throughput    | node  | network      | observed | bytes/sec | Tong luu luong vao/ra cua node      | Theo doi hoat dong mang tong         | Tong hop tu cac interface                  | 5s                   | yes             | yes              | no             | yes                       | Nen luu them rx/tx rieng                    |
| `node.network_error_count`     | Network Error Count   | node  | network      | derived  | count     | Tong loi mang theo cua so thoi gian | Phat hien bat thuong mang            | Tong hop tu interface errors               | 15s                  | yes             | yes              | no             | partial                   | Tuy OS co the lay duoc muc do khac nhau     |
| `node.process_count`           | Process Count         | node  | runtime      | observed | count     | Tong so process dang chay           | Hieu muc do hoat dong cua node       | OS process listing                         | 15s                  | no              | partial          | no             | yes                       | Huu ich cho debug                           |
| `node.service_running_count`   | Running Service Count | node  | runtime      | observed | count     | Tong so service dang chay           | Theo doi service inventory va health | OS service listing                         | 30s                  | no              | partial          | no             | yes                       | Ket hop voi service-level metrics           |
| `node.uptime_seconds`          | Uptime                | node  | availability | observed | seconds   | Thoi gian node da chay lien tuc     | Phat hien restart bat thuong         | OS uptime                                  | 30s                  | yes             | yes              | yes            | yes                       | Huu ich cho incident correlation            |
| `node.reboot_count_24h`        | Reboot Count 24h      | node  | availability | derived  | count     | So lan reboot trong 24 gio          | Phat hien node khong on dinh         | Event log + uptime reset events            | 1m                   | yes             | yes              | no             | partial                   | Can su dung event log hoac persisted state  |
| `node.temperature_c`           | Node Temperature      | node  | environment  | observed | celsius   | Nhiet do phan cung                  | Hieu qua nhiet do van hanh           | Sensor neu co, hoac agent vendor           | 15s                  | yes             | yes              | yes            | partial                   | Thuong kho lay dong bo tren laptop consumer |
| `node.health_score`            | Node Health Score     | node  | scoring      | derived  | score     | Diem suc khoe tong hop cua node     | Dashboard, AI enrichment, AR         | Cong thuc tong hop tu performance + alert  | 15s                  | yes             | yes              | yes            | yes                       | Nen la metric chinh cho overlay             |
| `node.risk_score`              | Node Risk Score       | node  | scoring      | derived  | score     | Diem rui ro cua node                | Uu tien xu ly su co                  | Tinh tu trend xau, anomaly, alert severity | 15s                  | yes             | yes              | yes            | partial                   | Co the them o giai doan AI                  |

## 4.4. Interface and connection metrics

| Metric Key                         | Display Name              | Scope     | Category     | Type     | Unit      | Description                                 | Purpose                               | Source / Collection Method                 | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                                   |
| ---------------------------------- | ------------------------- | --------- | ------------ | -------- | --------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------ | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | --------------------------------------- |
| `interface.status`                 | Interface Status          | interface | connectivity | observed | state     | Trang thai `up`, `down`, `disconnected`     | Phat hien mat ket noi                 | OS network adapter state                   | 5s                   | yes             | yes              | yes            | yes                       | Rat quan trong cho uplink               |
| `interface.link_speed_mbps`        | Link Speed                | interface | connectivity | observed | Mbps      | Toc do lien ket cua adapter                 | Hieu kha nang ket noi hien tai        | OS adapter properties                      | 30s                  | no              | partial          | no             | yes                       | Doi voi Wi-Fi co the thay doi           |
| `interface.rx_bytes_sec`           | RX Throughput             | interface | network      | observed | bytes/sec | Luu luong nhan tren interface               | Theo doi muc do su dung va bat thuong | Performance counter                        | 5s                   | yes             | yes              | no             | yes                       | Nen luu theo interface                  |
| `interface.tx_bytes_sec`           | TX Throughput             | interface | network      | observed | bytes/sec | Luu luong gui tren interface                | Theo doi muc do su dung va bat thuong | Performance counter                        | 5s                   | yes             | yes              | no             | yes                       | Bo sung cho rx                          |
| `interface.packet_error_count`     | Packet Error Count        | interface | network      | observed | count     | So loi packet trong cua so quan sat         | Phat hien van de mang                 | OS adapter statistics                      | 15s                  | yes             | yes              | no             | partial                   | Phu thuoc he dieu hanh va driver        |
| `interface.drop_count`             | Packet Drop Count         | interface | network      | observed | count     | So packet bi drop                           | Phat hien congestion hoac loi         | OS adapter statistics                      | 15s                  | yes             | yes              | no             | partial                   | Nen thu neu lay duoc                    |
| `interface.flap_count_1h`          | Flap Count 1h             | interface | connectivity | derived  | count     | So lan interface doi trang thai trong 1 gio | Phat hien adapter bat on dinh         | Dem su kien up/down                        | 1m                   | yes             | yes              | no             | partial                   | Huu ich cho VPN/Wi-Fi                   |
| `connection.path_availability_pct` | Path Availability         | interface | connectivity | derived  | %         | Ty le san sang cua duong ket noi            | Bao cao SLA nho trong PoC             | Tinh tu uptime cua interface va ping probe | 1m                   | yes             | yes              | no             | partial                   | Can active probe neu muon chinh xac hon |
| `wireless.signal_strength_dbm`     | Wi-Fi Signal Strength     | interface | wireless     | observed | dBm       | Cuong do song Wi-Fi                         | Chan doan ket noi khong on dinh       | API/lệnh Wi-Fi                             | 15s                  | yes             | yes              | no             | partial                   | Can bo sung collector rieng             |
| `wireless.channel_utilization_pct` | Wi-Fi Channel Utilization | interface | wireless     | observed | %         | Muc do ban kenh Wi-Fi                       | Chan doan nghen song                  | Wireless API neu co                        | 30s                  | yes             | partial          | no             | no                        | Thuong kho lay tren may local           |
| `vpn.tunnel_status`                | VPN Tunnel Status         | interface | vpn          | derived  | state     | Trang thai ket noi VPN                      | Hieu uplink rieng cho remote access   | Kiem tra adapter VPN va route              | 10s                  | yes             | yes              | yes            | yes                       | Voi may hien tai co Radmin VPN          |
| `vpn.tunnel_latency_ms`            | VPN Tunnel Latency        | interface | vpn          | observed | ms        | Do tre ket noi qua VPN                      | Theo doi chat luong tunnel            | Ping probe qua endpoint VPN                | 10s                  | yes             | yes              | no             | partial                   | Can endpoint muc tieu                   |

## 4.5. Service metrics

| Metric Key                      | Display Name          | Scope   | Category     | Type     | Unit    | Description                               | Purpose                         | Source / Collection Method               | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                             |
| ------------------------------- | --------------------- | ------- | ------------ | -------- | ------- | ----------------------------------------- | ------------------------------- | ---------------------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | --------------------------------- |
| `service.status`                | Service Status        | service | availability | observed | state   | Trang thai cua service                    | Xac dinh service down           | OS service manager hoac app health check | 10s                  | yes             | yes              | yes            | yes                       | Rat hop voi backend service       |
| `service.restart_count_24h`     | Service Restart Count | service | stability    | derived  | count   | So lan service khoi dong lai trong 24 gio | Phat hien crash loop            | Event log, SCM events, persisted count   | 1m                   | yes             | yes              | no             | partial                   | Dung cho maintenance workflow     |
| `service.response_time_ms`      | Service Response Time | service | performance  | observed | ms      | Thoi gian phan hoi cua service/API        | Theo doi chat luong dich vu     | HTTP probe / internal health endpoint    | 10s                  | yes             | yes              | yes            | partial                   | Rat nen co neu co backend local   |
| `service.error_rate_pct`        | Service Error Rate    | service | reliability  | observed | %       | Ty le loi cua request                     | Phat hien su co ung dung        | App logs, metrics endpoint               | 10s                  | yes             | yes              | yes            | partial                   | Huu ich cho AI anomaly            |
| `service.request_count_per_min` | Request Rate          | service | workload     | observed | req/min | Luong request xu ly                       | Hieu tai he thong               | App instrumentation                      | 10s                  | no              | yes              | no             | partial                   | Nen co neu app co API             |
| `service.health_score`          | Service Health Score  | service | scoring      | derived  | score   | Diem suc khoe tong hop cua service        | Dashboard, alert enrichment, AR | Tinh tu status, latency, error rate      | 15s                  | yes             | yes              | yes            | partial                   | Nen dung cho overlay theo service |

## 4.6. Container metrics

| Metric Key                    | Display Name                 | Scope     | Category     | Type     | Unit      | Description                                  | Purpose                              | Source / Collection Method              | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                             |
| ----------------------------- | ---------------------------- | --------- | ------------ | -------- | --------- | -------------------------------------------- | ------------------------------------ | --------------------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | --------------------------------- |
| `container.status`            | Container Status             | container | availability | observed | state     | Trang thai `running`, `exited`, `restarting` | Theo doi workload container          | Docker inspect / API                    | 10s                  | yes             | yes              | yes            | partial                   | Kha dung neu Docker dang chay     |
| `container.restart_count`     | Container Restart Count      | container | stability    | observed | count     | So lan container restart                     | Phat hien crash loop                 | Docker inspect                          | 10s                  | yes             | yes              | no             | partial                   | Rat huu ich cho triage            |
| `container.cpu_usage_pct`     | Container CPU Usage          | container | performance  | observed | %         | Muc su dung CPU cua container                | Theo doi noi gay tai                 | Docker stats                            | 5s                   | yes             | yes              | yes            | partial                   | Co the thu gon cho MVP            |
| `container.memory_used_mb`    | Container Memory Used        | container | performance  | observed | MB        | RAM dang dung cua container                  | Theo doi leak va pressure            | Docker stats                            | 5s                   | yes             | yes              | yes            | partial                   | Ket hop voi memory limit neu co   |
| `container.network_bytes_sec` | Container Network Throughput | container | network      | observed | bytes/sec | Luu luong mang cua container                 | Theo doi luu luong ung dung          | Docker stats                            | 5s                   | no              | partial          | no             | partial                   | De mo rong sau MVP                |
| `container.image_name`        | Image Name                   | container | inventory    | observed | text      | Ten image cua container                      | Cung cap ngu canh inventory          | Docker inspect                          | on-change            | no              | no               | yes            | partial                   | Metadata quan trong cho AR/detail |
| `container.port_bindings`     | Port Bindings                | container | inventory    | observed | text      | Danh sach port binding                       | Hieu ket noi service                 | Docker inspect                          | on-change            | no              | no               | yes            | partial                   | Nen luu trong metadata store      |
| `container.health_score`      | Container Health Score       | container | scoring      | derived  | score     | Diem suc khoe tong hop cua container         | Hien thi workload theo muc do rui ro | Tinh tu status + CPU + memory + restart | 15s                  | yes             | yes              | yes            | partial                   | Dung tot cho FR-23                |

## 4.7. IPAM metrics

| Metric Key                    | Display Name           | Scope | Category   | Type     | Unit    | Description                                    | Purpose                        | Source / Collection Method          | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                                      |
| ----------------------------- | ---------------------- | ----- | ---------- | -------- | ------- | ---------------------------------------------- | ------------------------------ | ----------------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | ------------------------------------------ |
| `ipam.interface_ipv4`         | Interface IPv4 Address | ipam  | addressing | observed | text    | Dia chi IPv4 cua interface                     | Hien thi mapping ket noi       | OS network config                   | 30s                  | no              | no               | yes            | yes                       | Nen luu thanh metadata                     |
| `ipam.prefix_length`          | Prefix Length          | ipam  | addressing | observed | cidr    | Do dai prefix cua interface                    | Hieu subnet ket noi            | OS network config                   | 30s                  | no              | no               | no             | yes                       | Metadata IPAM co ban                       |
| `ipam.subnet_utilization_pct` | Subnet Utilization     | ipam  | capacity   | derived  | %       | Ty le dia chi da su dung trong subnet quan sat | Hieu muc su dung IP            | Tinh tu inventory IP duoc ghi nhan  | 1m                   | yes             | yes              | no             | partial                   | Can co inventory nhieu host moi co y nghia |
| `ipam.duplicate_ip_detected`  | Duplicate IP Detected  | ipam  | integrity  | derived  | boolean | Co phat hien IP trung lap hay khong            | Phat hien xung dot IP          | Doi chieu inventory + probe         | 1m                   | yes             | yes              | no             | partial                   | PoC co the gia lap                         |
| `ipam.active_interface_count` | Active Interface Count | ipam  | inventory  | derived  | count   | So interface co IP active                      | Hieu pham vi ket noi           | Dem interface co status up va co IP | 30s                  | no              | partial          | no             | yes                       | Metric overview tot                        |
| `ipam.vpn_address_present`    | VPN Address Present    | ipam  | vpn        | derived  | boolean | Interface VPN co IP hop le hay khong           | Xac dinh tunnel co cap phat IP | Adapter VPN + IP config             | 30s                  | yes             | partial          | yes            | yes                       | Huu ich cho remote lab                     |

## 4.8. Operations and pipeline metrics

| Metric Key                       | Display Name               | Scope      | Category     | Type     | Unit      | Description                                        | Purpose                           | Source / Collection Method                  | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                              |
| -------------------------------- | -------------------------- | ---------- | ------------ | -------- | --------- | -------------------------------------------------- | --------------------------------- | ------------------------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | ---------------------------------- |
| `ops.alert_open_count`           | Open Alert Count           | operations | alerting     | observed | count     | So alert dang mo trong he thong                    | Dashboard NOC va triage           | Alert store                                 | 15s                  | yes             | yes              | yes            | yes                       | Rat quan trong cho FR-24           |
| `ops.alert_ack_pending_count`    | Unacknowledged Alert Count | operations | alerting     | observed | count     | So alert chua acknowledge                          | Uu tien xu ly                     | Alert store                                 | 15s                  | yes             | yes              | yes            | yes                       | Nen co tren overview               |
| `ops.incident_open_count`        | Open Incident Count        | operations | incident     | observed | count     | So incident dang mo                                | Theo doi tai van hanh             | Incident store                              | 15s                  | no              | partial          | no             | yes                       | Dung cho reporting                 |
| `ops.ticket_in_progress_count`   | Ticket In Progress Count   | operations | maintenance  | observed | count     | So ticket dang xu ly                               | Theo doi maintenance workflow     | Ticket store                                | 30s                  | no              | partial          | yes            | yes                       | Co the hien thi trong AR context   |
| `ops.mttr_minutes`               | Mean Time To Resolve       | operations | reporting    | derived  | minutes   | Thoi gian trung binh giai quyet incident/ticket    | KPI van hanh                      | Tinh tu alert/incident/ticket timestamps    | 5m                   | no              | yes              | no             | yes                       | Huu ich cho bao cao                |
| `ops.mttd_minutes`               | Mean Time To Detect        | operations | reporting    | derived  | minutes   | Thoi gian trung binh phat hien su co               | Danh gia monitoring               | Tinh tu su kien loi va alert tao ra         | 5m                   | no              | yes              | no             | partial                   | Can co moc su kien fault injection |
| `ops.collector_last_seen_at`     | Collector Last Seen        | operations | pipeline     | observed | timestamp | Moc thoi gian collector gui du lieu gan nhat       | Phat hien collector mat ket noi   | Heartbeat tu collector                      | 15s                  | yes             | yes              | no             | yes                       | Nen co cho moi collector           |
| `ops.collector_lag_seconds`      | Collector Lag              | operations | pipeline     | derived  | seconds   | Do tre giua thoi diem thu thap va thoi diem ingest | Phat hien stale data              | Backend ingest timestamp - sample timestamp | 15s                  | yes             | yes              | no             | yes                       | Rat quan trong cho FR-16           |
| `ops.ingestion_success_rate_pct` | Ingestion Success Rate     | operations | pipeline     | derived  | %         | Ty le ingest thanh cong                            | Theo doi do tin cay pipeline      | Dem success/fail theo cua so thoi gian      | 1m                   | yes             | yes              | no             | yes                       | Dung cho admin dashboard           |
| `ops.ingestion_error_count`      | Ingestion Error Count      | operations | pipeline     | observed | count     | So loi khi ingest telemetry                        | Phat hien backend/collector issue | Error logs / queue / handler                | 1m                   | yes             | yes              | no             | yes                       | Nen co phan loai ma loi            |
| `ops.stale_asset_count`          | Stale Asset Count          | operations | data-quality | derived  | count     | So asset qua han cap nhat du lieu                  | Hieu pham vi du lieu cu           | Dem asset vuot stale threshold              | 1m                   | yes             | yes              | no             | yes                       | Rat hop voi dashboard monitoring   |
| `ops.notification_failure_count` | Notification Failure Count | operations | notification | observed | count     | So lan gui thong bao that bai                      | Theo doi thong bao van hanh       | Notification job results                    | 1m                   | yes             | partial          | no             | partial                   | Huu ich cho FR-28                  |

## 4.9. Modeled DCIM support metrics

| Metric Key                 | Display Name    | Scope | Category    | Type    | Unit | Description                     | Purpose                              | Source / Collection Method | Collection Frequency | Alert Candidate | AI / Scoring Use | AR Overlay Use | Availability in Local PoC | Notes                            |
| -------------------------- | --------------- | ----- | ----------- | ------- | ---- | ------------------------------- | ------------------------------------ | -------------------------- | -------------------- | --------------- | ---------------- | -------------- | ------------------------- | -------------------------------- |
| `dcim.site_name`           | Site Name       | rack  | inventory   | modeled | text | Ten site ma rack thuoc ve       | To chuc topology va loc du lieu      | Metadata quan tri          | on-change            | no              | no               | yes            | modeled                   | Khong phai time-series thuan     |
| `dcim.rack_code`           | Rack Code       | rack  | inventory   | modeled | text | Ma rack trong topology          | Mapping dashboard va AR              | Metadata quan tri          | on-change            | no              | no               | yes            | modeled                   | Can cho marker mapping           |
| `dcim.power_feed_name`     | Power Feed Name | rack  | power       | modeled | text | Ten power feed                  | Minh hoa DCIM                        | Metadata quan tri          | on-change            | no              | no               | yes            | modeled                   | Co the dung cho AR overlay       |
| `dcim.cooling_zone`        | Cooling Zone    | rack  | environment | modeled | text | Vung lam mat cua rack           | Ngu canh nhiet                       | Metadata quan tri          | on-change            | no              | no               | no             | modeled                   | Tien cho mo rong sau nay         |
| `dcim.primary_uplink_name` | Primary Uplink  | rack  | network     | modeled | text | Interface uplink chinh cua rack | Cho phep tong hop rack uplink status | Metadata quan tri          | on-change            | no              | no               | yes            | modeled                   | Nen cau hinh de tinh rack metric |

## 5. Metric uu tien cho MVP

Neu can cat scope de lam nhanh, nen uu tien cac metric sau:

### 5.1. Nhom bat buoc

- `rack.status`
- `rack.health_score`
- `switch.status`
- `switch_port.status`
- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `node.uptime_seconds`
- `interface.status`
- `interface.rx_bytes_sec`
- `interface.tx_bytes_sec`
- `service.status`
- `ops.alert_open_count`
- `ops.collector_last_seen_at`
- `ops.collector_lag_seconds`

### 5.2. Nhom nen co

- `container.status`
- `container.restart_count`
- `switch.uplink_status`
- `switch_port.flap_count_1h`
- `service.response_time_ms`
- `ipam.interface_ipv4`
- `vpn.tunnel_status`
- `ops.ingestion_success_rate_pct`
- `ops.stale_asset_count`

### 5.3. Nhom mo rong sau

- `rack.temperature_c`
- `switch_port.error_count`
- `node.temperature_c`
- `wireless.signal_strength_dbm`
- `ipam.duplicate_ip_detected`
- `ops.mttd_minutes`
- `ops.mttr_minutes`
- `node.risk_score`

## 6. Giao dien va nghiep vu su dung metric

### 6.1. Dashboard realtime

Nen dung:

- `rack.status`, `rack.health_score`
- `switch.status`, `switch.uplink_status`
- `node.cpu_usage_pct`, `node.memory_used_pct`, `node.disk_used_pct`
- `interface.status`, `interface.rx_bytes_sec`, `interface.tx_bytes_sec`
- `service.status`, `container.status`
- `ops.alert_open_count`, `ops.stale_asset_count`

### 6.2. Alerting

Nen dat rule cho:

- CPU cao lien tuc
- RAM cao lien tuc
- Disk sap day
- Interface down
- Switch uplink down
- Switch port down/flap
- VPN down
- Service down
- Container restarting
- Collector lag qua nguong
- Stale data qua nguong

### 6.3. AR overlay

Nen hien thi gon:

- `dcim.rack_code`
- `switch.status`
- `rack.health_score`
- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `service.status`
- `ops.alert_open_count`
- `ops.ticket_in_progress_count`

### 6.4. AI analytics

Nen dua vao model:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `interface.rx_bytes_sec`
- `interface.tx_bytes_sec`
- `service.response_time_ms`
- `service.error_rate_pct`
- `container.restart_count`
- `ops.collector_lag_seconds`
- `ops.alert_open_count`

## 7. Goi y schema telemetry

Moi sample telemetry nen co cau truc chung:

```json
{
  "metricKey": "node.cpu_usage_pct",
  "scopeType": "node",
  "scopeId": "node-host-01",
  "rackId": "rack-a1",
  "switchId": "sw-a1",
  "nodeId": "node-host-01",
  "value": 73.4,
  "unit": "%",
  "timestamp": "2026-05-25T10:30:00Z",
  "source": "windows-perf-counter",
  "tags": {
    "site": "lab-local",
    "environment": "poc",
    "deviceType": "laptop"
  }
}
```

### 7.1. Truong metadata toi thieu

- `metricKey`
- `scopeType`
- `scopeId`
- `timestamp`
- `value`
- `unit`
- `source`

### 7.2. Truong enrichment nen co

- `rackId`
- `switchId`
- `nodeId`
- `serviceId`
- `containerId`
- `site`
- `tenant`
- `simulationRunId`
- `severityHint`

## 8. Goi y trien khai

## 8.1. Kien truc de xuat

Luong trien khai don gian cho PoC:

1. Mot `Telemetry Collector` chay tren may local.
2. Collector lay metric tu:
   - Windows performance counters
   - service/process listing
   - network adapter info
   - Docker CLI/API neu co container
3. Collector dong goi du lieu ve schema chung.
4. Backend ingest metrics vao:
   - kho time-series nhe hoac collection telemetry
   - bang metadata asset/rack/switch/node/service
5. Backend tinh:
   - `health_score`
   - `risk_score`
   - alert evaluation
   - stale data detection
6. Frontend dashboard va AR doc du lieu da enrich.

## 8.2. Nguon lay metric goi y tren Windows

- CPU, memory, disk, network: `Get-Counter`, PerformanceCounter API, WMI/CIM.
- Process: `Get-Process`.
- Service: `Get-Service`.
- IP, adapter, VPN: `Get-NetAdapter`, `Get-NetIPAddress`.
- Docker: `docker ps`, `docker inspect`, `docker stats --no-stream`.
- Uptime/event: WMI/CIM, Windows Event Log.

## 8.3. Tan suat thu thap de xuat

- `5s`: CPU, memory, network throughput, container CPU/memory, port throughput neu derive duoc.
- `10s`: service status, container status, HTTP health checks.
- `15s`: health score, collector lag, rack status.
- `30s`: IP config, adapter speed, uptime, environment metrics.
- `1m`: inventory recount, success rate, stale asset count.
- `event-driven`: alert, incident, ticket, service restart, container change.

## 8.4. Cach tinh health score goi y

Cong thuc tham khao:

- Bat dau tu `100`.
- Tru diem theo nguong:
  - CPU > 85% trong 3 mau: `-15`
  - Memory > 85%: `-15`
  - Disk > 90%: `-20`
  - Interface uplink down: `-25`
  - Service quan trong down: `-30`
  - Collector stale > 60s: `-20`
- Chan duoi tai `0`.

Co the tinh rieng cho `node`, sau do tong hop len `rack`.

## 8.5. Cach chon metric cho alert rule

Chi nen alert voi metric:

- Co y nghia van hanh ro rang.
- Co kha nang hanh dong.
- It bi nhieu.
- Co threshold hop ly.

Nen tranh alert truc tiep voi:

- metric metadata nhu `image_name`
- metric inventory it thay doi
- metric chi phuc vu hien thi

## 8.6. Cach xu ly metric modeled

Khong dua `modeled metric` vao time-series neu gia tri it thay doi. Nen luu:

- trong collection `assets` hoac `dcim_entities`
- join hoac enrich khi tra ve dashboard

Vi du:

- `rack.u_capacity`
- `rack.u_used`
- `dcim.site_name`
- `dcim.primary_uplink_name`

## 9. Khoang trong so voi DCIM that

Tai lieu nay chu y dung hoa giai giua `runtime monitoring` va `DCIM modeling`. Trong PoC:

- Lay that duoc:
  - performance
  - network adapter state
  - service/process/container state
  - IP config
  - operations pipeline metrics
- Can mo phong hoac metadata:
  - rack U
  - switch inventory nang cao
  - switch VLAN/STP/LACP
  - power feed
  - cooling zone
  - physical cabling
  - circuit provider
  - datacenter environmental sensors

Day la gioi han binh thuong cua PoC khi dung rack ao + node that + switch dang o muc partly-modeled trong mini data center mo phong.

## 10. De xuat backlog tiep theo

### 10.1. Backend

- Tao schema telemetry sample chung.
- Tao bang/collection `assets`, `nodes`, `services`, `containers`.
- Tao pipeline tinh `health_score`.
- Tao rule engine cho alert co ban.

### 10.2. Collector

- Module `system metrics`
- Module `network metrics`
- Module `service metrics`
- Module `docker metrics`
- Module `collector heartbeat`

### 10.3. Frontend va AR

- Card overview theo `rack`
- Card overview theo `switch`
- Detail page theo `node`
- View theo `service/container`
- Overlay AR toi gian voi `rack code`, `health`, `alerts`, `service status`

## 11. Ket luan

Bo metric trong tai lieu nay du de:

- Phu hop voi `FR-14` den `FR-19`
- Lam dau vao cho `FR-20` den `FR-24`
- Ho tro `FR-31` den `FR-34`
- Tao nen tang cho `FR-36`

Neu can cat gon de lam nhanh, hay lam truoc `rack`, `node`, `interface`, `service`, `operations`. Neu can mo rong theo dung huong NetBox/DCIM hon, bo sung `modeled metrics` va tach ro inventory metadata voi time-series telemetry.
