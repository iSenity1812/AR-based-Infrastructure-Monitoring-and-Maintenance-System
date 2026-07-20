# System Overview

## 1. Introduction

Hệ thống đề xuất là một nền tảng AR-assisted infrastructure monitoring and maintenance cho môi trường simulated data center.

Mục tiêu chính của hệ thống:

- tập trung giám sát hạ tầng theo thời gian gần real-time
- hỗ trợ cảnh báo và xử lý sự cố
- cung cấp AR-guided inspection cho kỹ sư bảo trì
- bổ sung anomaly detection và risk scoring bằng AI
- giữ rõ ranh giới giữa control plane và data plane

Hệ thống được mô tả theo architecture-first, có các thành phần chính:

- Web Dashboard
- WebAR Client
- Control Plane API and BFF
- các microservice control plane
- các service data plane
- Redpanda, ClickHouse, MongoDB, Redis, Object Storage
- Vertex AI cho training và model lifecycle

## 2. Main Users

### 2.1 System Operator

Người vận hành hệ thống sử dụng dashboard để:

- xem tình trạng hạ tầng tổng quan
- theo dõi alert và incident
- kiểm tra log, audit và notification status

### 2.2 Maintenance Engineer

Kỹ sư bảo trì sử dụng WebAR Client để:

- quét QR marker trong khu vực cần thao tác
- xem diagnostics bundle theo asset context
- nhận hướng dẫn kiểm tra và xử lý sự cố
- cập nhật inspection hoặc maintenance status

### 2.3 Admin / Supervisor

Người quản trị sử dụng dashboard để:

- quản lý user, role, access policy
- quản lý asset context và marker mapping
- theo dõi hiệu quả vận hành và xử lý sự cố

### 2.4 Simulation User

Người test hoặc demo sử dụng simulation flow để:

- tạo scenario
- inject fault
- quan sát telemetry và alert response

### 2.5 Analyst / Monitoring User

Người phân tích sử dụng hệ thống để:

- xem history telemetry
- xem trends, aggregates và anomaly signals
- phục vụ root-cause analysis và báo cáo

## 3. Core Functions

Hệ thống hỗ trợ các nhóm chức năng chính sau:

- centralized infrastructure monitoring
- telemetry ingestion và stream processing
- alert lifecycle management
- incident and maintenance workflow
- AR-guided diagnostics và inspection
- AI-assisted anomaly and risk enrichment
- simulation-based data generation
- audit và notification

## 4. Key Inputs

Dữ liệu đầu vào chính bao gồm:

- telemetry batches từ collectors
- simulation events từ simulation producers
- operator commands từ dashboard
- QR marker scans từ WebAR Client
- workflow updates như acknowledge, assign, inspect, close
- metadata về asset, topology và maintenance context

## 5. Key Outputs

Kết quả đầu ra của hệ thống bao gồm:

- dashboard views
- AR diagnostics bundle
- alert status và incident status
- notification delivery events
- audit trail
- historical telemetry views
- AI enrichment results

## 6. Scope and Boundaries

Hệ thống tập trung vào:

- control plane cho nghiệp vụ vận hành
- data plane cho ingest và processing
- AR diagnostics qua control plane
- AI là lớp enrich, không phải owner của workflow truth

Hệ thống không tập trung vào:

- native mobile AR app
- direct raw telemetry access từ WebAR Client
- mô hình AI thay thế hoàn toàn quy trình vận hành
- query-only microservice chỉ để tổng hợp dữ liệu

## 7. Expected Value

Giá trị mong đợi:

- phát hiện bất thường sớm hơn
- rút ngắn thời gian chẩn đoán sự cố
- giảm sai sót khi kiểm tra tại hiện trường
- tăng khả năng traceability và auditability
- góp phần hình thành một mô hình vận hành có AI support nhưng vẫn giữ source of truth rõ ràng

