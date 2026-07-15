Có, và mình nghĩ `rack-overview.md` đã đủ rõ để tách ra thành một implementation plan khá sạch cho team.

**Implementation Plan: Rack Overview Endpoint**

**Overview**  
Chúng ta sẽ triển khai `GET /api/v1/monitoring/racks/overview` như một consumer-shaped endpoint cho Operator Dashboard. Nguồn sự thật vẫn là `telemetry_db.rack_current_summary` và `telemetry_db.v_rack_summary_history`, còn backend chịu trách nhiệm assemble các trường dẫn xuất như `riskCards`, `trend.delta*`, `trend.lastChangeAgeSec`, và contract JSON cuối cùng.

**Architecture decisions**

- ClickHouse giữ vai trò `single source of truth` cho current state và history snapshots.
- Backend không tính lại severity hay blast radius; backend chỉ compose, enrich, sort, và format payload.
- `riskCards` là derived subset của rack list đã sort, không tạo query riêng.
- Trend delta và `trend.lastChangeAgeSec` được tính ở backend từ history view, chưa materialize ở DB ở phase đầu.

**Task List**

### Phase 1: Foundation

## Task 1: Define Rack Overview API contract and DTOs

**Description:**  
Tạo các response DTO/model nội bộ cho `MonitoringRackOverviewResponse`, `RackOverviewSummary`, `RackOverviewItem`, và `RackOverviewFilters` bám đúng contract trong doc.

**Acceptance criteria:**

- [x] DTO phản ánh đầy đủ các field trong `rack-overview.md`
- [x] Có typing rõ cho summary, grid item, filters, top risk items
- [x] Có quy ước fallback cho `rack.name`, `trend.lastChangeAgeSec`, `trend.delta*`

**Verification:**

- [x] Build succeeds cho monitoring-service
- [x] Manual check: đối chiếu DTO với doc, không thiếu field
- [x] Không có field backend-only bị lộ sai vào response

**Dependencies:** None

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../dto/*`
- `backend/apps/control-plane/monitoring-service/docs/rack-overview.md` nếu cần chỉnh khớp naming

**Estimated scope:** S

---

## Task 2: Implement ClickHouse query models for current summary and summary counters

**Description:**  
Tạo query/repository layer để đọc:

- danh sách rack từ `rack_current_summary`
- summary counters từ cùng view

**Acceptance criteria:**

- [x] Có query lấy full rack list đúng thứ tự vận hành
- [x] Có query summary counters đúng semantic trong doc
- [x] Query mapping ra model nội bộ ổn định, không parse tại controller

**Verification:**

- [x] Manual check: câu SQL match doc
- [x] Unit test hoặc mapper test cho row-to-model mapping
- [x] Build succeeds

**Dependencies:** Task 1

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../repositories/*`
- `backend/apps/control-plane/monitoring-service/src/.../queries/*`

**Estimated scope:** M

---

## Task 3: Implement history query model for rack trend enrichment

**Description:**  
Tạo query layer đọc `v_rack_summary_history` cho `1m` và `5m`, đủ để backend tính delta và last-change age.

**Acceptance criteria:**

- [x] Query chỉ lấy fields cần cho enrichment
- [x] Hỗ trợ lọc recent history window cho tất cả rack
- [x] Mapping giữ được `bucket_granularity`, `bucket_start`, `rack_severity_code`, `has_signal_loss`

**Verification:**

- [x] SQL match spec trong doc
- [x] Build succeeds
- [x] Manual review: đủ dữ liệu để tính 3 derived fields

**Dependencies:** Task 2

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../repositories/*`
- `backend/apps/control-plane/monitoring-service/src/.../models/*`

**Estimated scope:** S

### Checkpoint: Foundation

- [x] Query contracts đầy đủ cho current + summary + history
- [x] Build passes
- [x] Naming giữa DTO và query models nhất quán

---

### Phase 2: Core Composition

## Task 4: Implement rack overview composition service

**Description:**  
Viết service/use-case assemble payload cuối cùng từ current rows, summary counters, và history rows.

**Acceptance criteria:**

- [x] Compose được `overview.counts`, `riskCards`, `rackList.sort`, `filters`
- [x] `riskCards` lấy từ sorted full list, không query riêng
- [x] Có fallback hợp lệ khi history hoặc rack name chưa có

**Verification:**

- [x] Unit tests cho happy path composition
- [x] Build succeeds
- [x] Manual check: payload shape đúng như doc

**Dependencies:** Task 1, Task 2, Task 3

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../services/*`
- `backend/apps/control-plane/monitoring-service/src/.../use-cases/*`

**Estimated scope:** M

---

## Task 5: Implement enrichment logic for `trend.delta*` and `trend.lastChangeAgeSec`

**Description:**  
Tách riêng logic derived fields để tránh nhét quá nhiều rule vào controller/service chính.

**Acceptance criteria:**

- [x] Tính đúng `trend.delta1m`
- [x] Tính đúng `trend.delta5m`
- [x] Tính đúng `trend.lastChangeAgeSec` theo history scan rule
- [x] Trường hợp thiếu history trả về default theo doc

**Verification:**

- [x] Unit tests cho:
  - không có history
  - worsening
  - recovering
  - unchanged state
- [x] Build succeeds
- [x] Manual review: logic khớp semantics doc

**Dependencies:** Task 3, Task 4

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../services/*`
- `backend/apps/control-plane/monitoring-service/src/.../utils/*`
- `backend/apps/control-plane/monitoring-service/test/*`

**Estimated scope:** M

---

## Task 6: Expose `GET /api/v1/monitoring/racks/overview`

**Description:**  
Tạo endpoint/controller public cho frontend gọi, nối vào use-case compose phía trên.

**Acceptance criteria:**

- [x] Endpoint trả đúng HTTP 200 payload theo contract
- [x] Response time path không chạm raw telemetry
- [x] Có error mapping tối thiểu cho query failure/downstream failure

**Verification:**

- [x] Route wiring passes build
- [x] Manual check: endpoint trả đúng JSON shape
- [ ] Integration test hoặc controller test passes

**Dependencies:** Task 4, Task 5

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/src/.../controllers/*`
- `backend/apps/control-plane/monitoring-service/src/.../routes/*`
- `backend/apps/control-plane/monitoring-service/test/*`

**Estimated scope:** S

### Checkpoint: Core Features

- [ ] Endpoint trả được payload đầy đủ
- [ ] Derived fields đúng với sample scenarios
- [ ] Không có field phải tính lại ở frontend

---

### Phase 3: Reliability and UX Readiness

## Task 7: Add contract-level tests with representative rack scenarios

**Description:**  
Viết test theo góc nhìn consumer để chứng minh payload phục vụ đúng trực giác operator.

**Acceptance criteria:**

- [ ] Có case `critical rack with signal loss`
- [ ] Có case `rack-level failure by bad_node_ratio`
- [ ] Có case `stable rack with no history`
- [ ] Có case sort order giữa nhiều rack cạnh tranh

**Verification:**

- [ ] Test suite passes
- [ ] Expected JSON snapshots rõ ràng, không mơ hồ
- [ ] Build succeeds

**Dependencies:** Task 6

**Files likely touched:**

- `backend/apps/control-plane/monitoring-service/test/*`

**Estimated scope:** M

---

## Task 8: Add API documentation and frontend integration notes

**Description:**  
Viết doc đủ để frontend dùng ngay: field semantics, sort semantics, fallback rules, and loading strategy.

**Acceptance criteria:**

- [ ] Doc ghi rõ source-of-truth views
- [ ] Doc ghi rõ semantic của `trend.delta*`
- [ ] Doc ghi rõ fallback rules và nullability
- [ ] Frontend biết field nào render trực tiếp, field nào optional

**Verification:**

- [ ] Doc reviewed against endpoint payload
- [ ] Không còn naming mismatch giữa code và doc
- [ ] Manual check: frontend dev có thể mock payload từ doc

**Dependencies:** Task 6

**Files likely touched:**

- [rack-overview.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/backend/apps/control-plane/monitoring-service/docs/rack-overview.md)
- thêm docs API nếu repo đang có chuẩn riêng

**Estimated scope:** S

### Checkpoint: Complete

- [ ] Endpoint chạy ổn với current + history serving layer
- [ ] Contract test pass
- [ ] Frontend có thể tích hợp không cần hỏi lại field semantics

**Risks and mitigations**

| Risk                                          | Impact | Mitigation                                      |
| --------------------------------------------- | ------ | ----------------------------------------------- |
| `trend.lastChangeAgeSec` logic dễ lệch trực giác | High   | Tách riêng thành utility + test scenario rõ     |
| `rack.name` chưa có topology enrichment       | Medium | Fallback cứng về `rack.id`                      |
| History query quá rộng khi rack count lớn     | Medium | Giới hạn window và chỉ lấy fields tối thiểu     |
| Naming mismatch giữa SQL docs và backend DTO  | Medium | Chốt contract names ở Task 1 rồi bám xuyên suốt |

**Suggested implementation order**

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Checkpoint review with human
8. Task 7
9. Task 8

**Natural next steps**

1. Mình viết tiếp plan tương tự cho `Rack Detail & Diagnostics`
2. Mình convert plan này thành checklist file `.md` trong repo
3. Mình bắt đầu luôn Task 1 và Task 2 trong codebase
