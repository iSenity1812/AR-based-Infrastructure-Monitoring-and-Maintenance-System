# Data Flow

## 1. Luồng Dữ Liệu Đầu Cuối (End-to-End Data Flow)

Luồng dữ liệu chính trong hệ thống đi theo hướng:

Telemetry Collectors / Simulation Producers -> Telemetry Ingestion Service -> Kafka / TimescaleDB -> Stream Processing Service -> Monitoring Service / AI Analytics Service -> Control Plane API and BFF -> Web Dashboard / WebAR Client

## 2. Thu Thập Telemetry

Collectors và Simulation Producers gửi batch telemetry kèm metadata.

Đầu vào có thể gồm:

- Metric samples
- Asset identifiers
- Timestamp
- Simulation tags
- Producer metadata

## 3. Luồng Ingestion

Telemetry Ingestion Service thực hiện:

1. Authenticate producer
2. Validate schema
3. Enforce idempotency
4. Persist raw telemetry
5. Publish canonical event

Nếu payload không hợp lệ:

- Lưu archive nếu cần
- Ghi nhận invalid metadata
- Không đưa vào stream processing như dữ liệu hợp lệ

## 4. Luồng Kafka Backbone

Kafka được dùng để:

- Phân tán telemetry events
- Fan-out cho stream processing
- Truyền snapshot updates
- Truyền AI enrichment outputs
- Truyền simulation events

Kafka là event backbone, không phải nơi lưu business truth.

## 5. Luồng Stream Processing

Stream Processing Service nhận event để:

- Enrich topology
- Tạo latest snapshot
- Tính aggregate window
- Evaluate rule
- Tạo alert candidate
- Chuẩn bị feature cho AI

Derived outputs có thể được đưa vào:

- Redis
- TimescaleDB
- Kafka

## 6. Luồng Monitoring và Alert

Monitoring Service nhận derived outputs để:

- Tạo và cập nhật alert
- Quản lý alert rules
- Phục vụ read models cho dashboard

Nếu alert cần xử lý nghiệp vụ tiếp:

- Incident Workflow Service tạo hoặc cập nhật incident và ticket
- Notification Service gửi thông báo
- Audit Service ghi audit trail

## 7. Luồng AR Diagnostics

Khi WebAR Client quét QR marker:

1. Client gửi request đến Control Plane API and BFF
2. BFF resolve marker thông qua Asset Context Service
3. BFF lấy latest snapshot từ derived state
4. BFF lấy alert context từ Monitoring Service
5. BFF lấy workflow context từ Incident Workflow Service
6. BFF có thể lấy historical snippet từ TimescaleDB nếu cần
7. BFF compose diagnostics bundle và trả về cho client

Quan trọng:

- WebAR Client không query raw telemetry trực tiếp
- Marker resolution phải đi qua Control Plane

## 8. Luồng AI Enrichment

AI enrichment đi theo các bước:

1. Stream Processing Service tạo feature window
2. AI Analytics Service nhận input
3. Model thực hiện anomaly detection hoặc risk scoring
4. Inference record được lưu lại
5. Kết quả được publish hoặc consume bởi Monitoring Service và BFF

AI output có thể được dùng để:

- Bổ sung alert context
- Hiển thị risk level
- Hỗ trợ triage và inspection

## 9. Luồng Từ Alert Đến Incident

Sau khi alert được triage:

1. Monitoring Service giữ lifecycle của alert
2. Incident Workflow Service tạo incident hoặc ticket
3. Notification Service gửi thông báo
4. Audit Service ghi lại hành động
5. Control Plane API and BFF cung cấp trạng thái mới nhất cho UI

## 10. Vòng Lặp Phản Hồi (Feedback Loop)

Dữ liệu từ workflow và inspection có thể quay lại để:

- Cập nhật asset context
- Làm giàu alert context
- Huấn luyện AI theo batch
- Điều chỉnh monitoring rules

Đây là vòng lặp cải tiến, nhưng vẫn phải giữ rõ ownership của từng service.

## 11. Các Ràng Buộc Về Luồng Dữ Liệu

- Không có direct raw telemetry access từ WebAR Client
- Không để BFF trở thành source of truth
- Không dùng Kafka để thay thế database nghiệp vụ
- Không để AI tự mình quản lý workflow
- Không query trực tiếp database của service khác
