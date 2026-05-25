# Actors and Use Cases

## Project

**AI and AR-based Micro Data Center Monitoring and Maintenance System**

> Ghi chú: Trong phạm vi đồ án, PC/Laptop được sử dụng để mô phỏng các physical node/server của Micro Data Center do nhóm không có điều kiện triển khai trên Data Center thật. Docker container được sử dụng để mô phỏng các workload/service chạy trên từng node.

---

# 1. Actors

## 1.1 Actor Overview

| Actor | Type | Description |
|---|---|---|
| **System User** | Human Actor | Actor cha đại diện cho các người dùng có thể đăng nhập vào hệ thống. |
| **System Admin** | Human Actor | Quản lý toàn bộ nền tảng, tài khoản người dùng, phân quyền, cấu hình hệ thống và audit log. |
| **Data Center Administrator** | Human Actor | Quản lý cụm Micro Data Center, node, container, marker, cảnh báo, incident và ticket. |
| **Operation Manager** | Human Actor | Theo dõi tổng quan hệ thống, xem dashboard, dữ liệu lịch sử và báo cáo vận hành. |
| **Maintenance Technician** | Human Actor | Sử dụng AR app để quét marker, kiểm tra node vật lý, xem cảnh báo, xem log và xử lý ticket bảo trì. |
| **Telemetry Agent** | System Actor | Agent cài trên PC/Laptop mô phỏng server node, thu thập telemetry và container metadata rồi gửi về backend. |
| **AI Analysis Engine** | System Actor | Phân tích dữ liệu telemetry, phát hiện bất thường, tính health/risk score và tạo cảnh báo. |
| **Notification System** | System Actor | Gửi thông báo/cảnh báo đến người dùng thông qua dashboard hoặc mobile app. |

---

## 1.2 Actor Inheritance

Các actor người dùng có thể kế thừa từ actor cha **System User**.

```text
System User
├── System Admin
├── Data Center Administrator
├── Operation Manager
└── Maintenance Technician
```

Các actor hệ thống hoạt động độc lập:

```text
Telemetry Agent
AI Analysis Engine
Notification System
```

---

## 1.3 Actor Responsibilities

| Actor | Main Responsibilities |
|---|---|
| **System User** | Đăng nhập hệ thống, xem thông tin được phân quyền, nhận thông báo nếu có quyền. |
| **System Admin** | Quản lý user, role, system configuration và audit log. |
| **Data Center Administrator** | Quản lý cluster, node, marker, container, alert, incident, ticket và báo cáo kỹ thuật. |
| **Operation Manager** | Theo dõi tình trạng vận hành, xem dashboard, xem dữ liệu lịch sử và báo cáo. |
| **IT Technician** | Xử lý ticket, sử dụng AR để kiểm tra node, xem log, xem hướng dẫn xử lý và gửi kết quả inspection. |
| **Mini Agent** | Thu thập CPU, RAM, disk, network, container status và gửi dữ liệu realtime lên backend. |
| **AI Engine** | Phân tích bất thường, tính điểm sức khỏe/rủi ro, tạo cảnh báo và đề xuất hướng xử lý. |
| **Notification System** | Gửi cảnh báo đến đúng người dùng hoặc nhóm người dùng phù hợp. |

---

# 2. Use Cases

## 2.1 Use Case List

| ID | Use Case | Main Actor | Description |
|---|---|---|---|
| **UC01** | Login | System User | Người dùng đăng nhập vào hệ thống để sử dụng các chức năng theo quyền được cấp. |
| **UC02** | User & Role Management | System Admin | Quản lý tài khoản người dùng, vai trò, quyền truy cập và trạng thái tài khoản. |
| **UC03** | Cluster Management | Data Center Administrator | Quản lý thông tin cụm Micro Data Center, trạng thái cụm và cấu hình tổng quan. |
| **UC04** | Node Management | Data Center Administrator | Quản lý các node/server trong cụm, bao gồm đăng ký, cập nhật, vô hiệu hóa hoặc xóa node. |
| **UC05** | Marker Management | Data Center Administrator, Maintenance Technician | Quản lý QR/ArUco Marker và ánh xạ marker với node vật lý tương ứng. |
| **UC06** | Container Management | Data Center Administrator | Xem và quản lý thông tin container/workload đang chạy trên từng node. |
| **UC07** | Collect Telemetry Data | Telemetry Agent | Thu thập dữ liệu CPU, RAM, disk, network và các chỉ số hệ thống từ node. |
| **UC08** | Collect Container Metadata | Telemetry Agent | Thu thập metadata của container như container ID, image, service name, status và restart count. |
| **UC09** | Send Realtime Data | Telemetry Agent | Gửi dữ liệu telemetry và container metadata về backend theo thời gian thực. |
| **UC10** | View Realtime Dashboard | Data Center Administrator, Operation Manager | Xem dashboard hiển thị trạng thái realtime của cluster, node và container. |
| **UC11** | View Node/Container Details | Data Center Administrator, Maintenance Technician | Xem thông tin chi tiết của node hoặc container, bao gồm IP, trạng thái, metrics và health score. |
| **UC12** | View Historical Data | Data Center Administrator, Operation Manager | Xem dữ liệu lịch sử của node, container, telemetry, alert và incident. |
| **UC13** | Analyze Anomaly | AI Analysis Engine | Phân tích dữ liệu telemetry để phát hiện hành vi bất thường trong hệ thống. |
| **UC14** | Calculate Health/Risk Score | AI Analysis Engine | Tính điểm sức khỏe hoặc mức độ rủi ro của node/container dựa trên nhiều chỉ số. |
| **UC15** | Generate Alert | AI Analysis Engine | Tạo cảnh báo khi phát hiện bất thường hoặc khi metric vượt ngưỡng nguy hiểm. |
| **UC16** | Alert Rule Management | Data Center Administrator | Cấu hình và quản lý các rule cảnh báo như CPU, RAM, disk, network hoặc container status. |
| **UC17** | Send Notification | Notification System | Gửi thông báo cảnh báo đến dashboard hoặc mobile app cho người dùng liên quan. |
| **UC18** | Receive Alert Notification | System User | Người dùng nhận cảnh báo theo vai trò và quyền được phân công trong hệ thống. |
| **UC19** | Incident Management | Data Center Administrator | Quản lý incident được tạo từ các cảnh báo, bao gồm xem, cập nhật trạng thái và đóng incident. |
| **UC20** | Ticket Management | Data Center Administrator, Maintenance Technician | Quản lý ticket bảo trì, bao gồm tạo, xem, cập nhật và theo dõi tiến độ xử lý. |
| **UC21** | Assign Ticket | Data Center Administrator | Gán ticket cho kỹ thuật viên phù hợp để xử lý sự cố tại node vật lý. |
| **UC22** | Update Ticket Status | Maintenance Technician | Cập nhật trạng thái ticket như acknowledged, in progress, resolved hoặc escalated. |
| **UC23** | Start AR Session | Maintenance Technician | Bắt đầu phiên làm việc AR trên mobile app để hỗ trợ kiểm tra và bảo trì node. |
| **UC24** | Scan Marker | Maintenance Technician | Quét QR/ArUco Marker để nhận diện node vật lý và truy xuất thông tin tương ứng. |
| **UC25** | View AR Node Overlay | Maintenance Technician | Hiển thị overlay AR gồm Node IP, trạng thái node, container đang chạy và health/risk score. |
| **UC26** | View AR Alert Overlay | Maintenance Technician | Hiển thị cảnh báo trực quan trên AR khi node hoặc container có sự cố. |
| **UC27** | View Logs in AR | Maintenance Technician | Xem crash log hoặc service log liên quan trực tiếp trên giao diện AR. |
| **UC28** | View Remediation Guidance | Maintenance Technician | Xem hướng dẫn xử lý sự cố theo ngữ cảnh, ví dụ kiểm tra nhiệt độ, container crash hoặc disk usage. |
| **UC29** | Submit AR Inspection Result | Maintenance Technician | Gửi kết quả kiểm tra, ghi chú, bằng chứng hoặc trạng thái xử lý sau khi bảo trì. |
| **UC30** | Report Management | Data Center Administrator, Operation Manager | Xem và xuất báo cáo về cluster, node, container, alert, incident, ticket và hiệu suất vận hành. |

---

# 3. Use Case Grouping by Module

## 3.1 User & Role Management

| ID | Use Case | Actor |
|---|---|---|
| UC01 | Login | System User |
| UC02 | User & Role Management | System Admin |

---

## 3.2 Cluster & Asset Management

| ID | Use Case | Actor |
|---|---|---|
| UC03 | Cluster Management | Data Center Administrator |
| UC04 | Node Management | Data Center Administrator |
| UC05 | Marker Management | Data Center Administrator, Maintenance Technician |
| UC06 | Container Management | Data Center Administrator |

---

## 3.3 Realtime Monitoring

| ID | Use Case | Actor |
|---|---|---|
| UC07 | Collect Telemetry Data | Telemetry Agent |
| UC08 | Collect Container Metadata | Telemetry Agent |
| UC09 | Send Realtime Data | Telemetry Agent |
| UC10 | View Realtime Dashboard | Data Center Administrator, Operation Manager |
| UC11 | View Node/Container Details | Data Center Administrator, Maintenance Technician |
| UC12 | View Historical Data | Data Center Administrator, Operation Manager |

---

## 3.4 AI Analysis & Alert

| ID | Use Case | Actor |
|---|---|---|
| UC13 | Analyze Anomaly | AI Analysis Engine |
| UC14 | Calculate Health/Risk Score | AI Analysis Engine |
| UC15 | Generate Alert | AI Analysis Engine |
| UC16 | Alert Rule Management | Data Center Administrator |
| UC17 | Send Notification | Notification System |
| UC18 | Receive Alert Notification | System User |

---

## 3.5 Incident & Ticket Management

| ID | Use Case | Actor |
|---|---|---|
| UC19 | Incident Management | Data Center Administrator |
| UC20 | Ticket Management | Data Center Administrator, Maintenance Technician |
| UC21 | Assign Ticket | Data Center Administrator |
| UC22 | Update Ticket Status | Maintenance Technician |

---

## 3.6 AR Maintenance

| ID | Use Case | Actor |
|---|---|---|
| UC23 | Start AR Session | Maintenance Technician |
| UC24 | Scan Marker | Maintenance Technician |
| UC25 | View AR Node Overlay | Maintenance Technician |
| UC26 | View AR Alert Overlay | Maintenance Technician |
| UC27 | View Logs in AR | Maintenance Technician |
| UC28 | View Remediation Guidance | Maintenance Technician |
| UC29 | Submit AR Inspection Result | Maintenance Technician |

---

## 3.7 Report

| ID | Use Case | Actor |
|---|---|---|
| UC30 | Report Management | Data Center Administrator, Operation Manager |

---

# 4. Suggested Relationships for Use Case Diagram

## 4.1 Include Relationships

| Main Use Case | Relationship | Included Use Case |
|---|---|---|
| Realtime Monitoring | include | Collect Telemetry Data |
| Realtime Monitoring | include | Collect Container Metadata |
| Realtime Monitoring | include | Send Realtime Data |
| AI Analysis | include | Analyze Anomaly |
| AI Analysis | include | Calculate Health/Risk Score |
| AR Maintenance | include | Start AR Session |
| AR Maintenance | include | Scan Marker |
| AR Maintenance | include | View AR Node Overlay |
| AR Maintenance | include | View AR Alert Overlay |
| AR Maintenance | include | View Logs in AR |
| AR Maintenance | include | View Remediation Guidance |
| AR Maintenance | include | Submit AR Inspection Result |
| Report Management | include | View Historical Data |

---

## 4.2 Extend Relationships

| Base Use Case | Relationship | Extension Use Case |
|---|---|---|
| AI Analysis | extend | Generate Alert |
| Generate Alert | extend | Send Notification |
| Generate Alert | extend | Incident Management |
| Incident Management | extend | Ticket Management |
| Ticket Management | extend | Assign Ticket |
| Ticket Management | extend | Update Ticket Status |
| View AR Node Overlay | extend | View AR Alert Overlay |
| View AR Node Overlay | extend | View Logs in AR |
| View AR Node Overlay | extend | View Remediation Guidance |

---

# 5. Notes for Diagram Drawing

- Nên dùng actor cha **System User** để giảm số lượng dây nối.
- Các actor **System Admin**, **Data Center Administrator**, **Operation Manager** và **Maintenance Technician** kế thừa từ **System User**.
- Các chức năng thêm, sửa, xóa nên được gộp thành các use case dạng **Management**.
- Các actor hệ thống như **Telemetry Agent**, **AI Analysis Engine** và **Notification System** nên đặt riêng bên ngoài system boundary.
- Với diagram chính trong báo cáo, có thể chỉ vẽ các use case lớn như:
  - User & Role Management
  - Cluster Management
  - Node Management
  - Marker Management
  - Container Management
  - Realtime Monitoring
  - AI Analysis
  - Alert Management
  - Incident Management
  - Ticket Management
  - AR Maintenance
  - Report Management
