# AI Model Integration

## 1. Vai Trò Của AI Trong Hệ Thống

AI được sử dụng như một lớp enrichment cho hệ thống, không phải owner của operational workflow.

Vai trò chính:

- anomaly detection
- risk scoring
- predictive hint generation
- contextual enrichment cho dashboard và AR diagnostics

AI không được:

- thay thế alert lifecycle
- thay thế incident workflow
- trở thành source of truth của business data

## 2. AI Inputs

Dữ liệu vào cho AI có thể đến từ:

- telemetry windows
- enriched telemetry from stream processing
- snapshot context
- asset context
- historical alert patterns
- simulation-tagged telemetry

Input nên được compose từ data plane và control plane boundary, không lấy trực tiếp từ raw client access.

## 3. AI Output

Output của AI model có thể gồm:

- anomaly score
- risk score
- predicted failure hint
- enrichment tags
- confidence metadata

Output phải được ghi nhận thành inference record để platform có thể trace lại.

## 4. Model Lifecycle

Lifecycle đề xuất:

1. platform trích feature windows
2. feature export được lưu ra object storage nếu cần
3. Vertex AI dùng để train và theo dõi experiment
4. model registry lưu version model
5. platform sync model metadata về AI Analytics Service
6. online scoring hoặc batch scoring sử dụng model đã được đăng ký

## 5. Integration With Platform Services

### 5.1 With Stream Processing Service

Stream Processing Service có thể:

- tạo feature windows
- enrich snapshot
- phát sinh input cho AI scoring

### 5.2 With Monitoring Service

Monitoring Service có thể consume AI output để:

- bổ sung context cho alert
- hỗ trợ triage
- hiển thị diagnostics giàu ngữ cảnh hơn

### 5.3 With Control Plane API and BFF

BFF dùng AI output trong read composition:

- dashboard views
- AR diagnostics bundle
- triage context

### 5.4 With Incident Workflow Service

Incident Workflow Service có thể nhận enrichment để:

- hỗ trợ quyết định xử lý
- liên kết với incident và ticket

## 6. Online and Batch Usage

### 6.1 Online

Online scoring phù hợp cho:

- near real-time anomaly alerts
- risk enrichment
- quick diagnostics support

### 6.2 Batch

Batch processing phù hợp cho:

- training dataset generation
- offline evaluation
- feature export
- periodic analytics

## 7. Vertex AI Usage

Vertex AI được dùng cho:

- training jobs
- experiment tracking
- model registry
- lifecycle management

Vertex AI không được đặt trong hot path của:

- telemetry ingest
- alert lifecycle
- AR diagnostics request path

## 8. Storage for AI Data

### 8.1 AI Analytics DB

AI Analytics Service lưu:

- inference records
- model metadata phục vụ platform

### 8.2 Object Storage

Dùng cho:

- feature exports
- model artifacts
- evidence and archives

### 8.3 Redpanda

Dùng cho:

- inference completion events
- downstream enrichment propagation

## 9. Constraints

- AI không được trở thành owner của alert creation
- AI không được sở hữu maintenance workflow truth
- AI không được query database của service khác trực tiếp
- AI output phải đi qua service boundary rõ ràng
- không đưa Vertex AI vào online hot path nếu chưa có quy định mới

