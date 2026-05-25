# System Requirements for AR-Based Infrastructure Monitoring and Maintenance Platform

## 1. Muc dich tai lieu

Tai lieu nay mo ta tap requirement he thong o muc do business analysis cho nen tang giam sat va bao tri ha tang mo phong ket hop AR, telemetry thoi gian thuc va ho tro AI.

Tai lieu chi ghi nhan nhung noi dung da duoc xac nhan ro rang tu hai nguon sau:

- `.misc/usecase-diagram-minimalist.mmd`
- `.misc/system_usecase_mongodb_schema_vn.md`

Tai lieu nay khong co muc tieu mo ta day du moi kha nang co the phat sinh trong tuong lai. Neu mot noi dung chua duoc xac nhan ro trong hai tai lieu nguon, noi dung do khong duoc dua vao requirement chinh thuc o day.

## 2. Tong quan he thong

### 2.1 Ten he thong

Nen tang giam sat va bao tri ha tang trung tam du lieu mo phong dua tren AR, telemetry thoi gian thuc va phan tich AI.

### 2.2 Muc tieu nghiep vu

He thong phai ho tro ba gia tri cot loi sau:

1. Giam sat tap trung suc khoe ha tang mo phong o cap rack ao, switch, node va workload.
2. Ho tro bao tri tai cho bang AR thong qua marker mapping giua tai san vat ly mo phong va du lieu van hanh.
3. Lam giau xu ly van hanh bang canh bao, anomaly detection, risk insight va quy trinh incident-ticket.

### 2.3 Pham vi xac nhan

Trong pham vi:

- Dashboard web cho quan tri va van hanh.
- Quan ly topology rack ao, switch, node, service/container va marker.
- Thu thap telemetry va metadata tu moi truong mo phong.
- Hien thi dashboard realtime va tra cuu lich su.
- Cau hinh alert rule va xu ly alert.
- Tao incident va dispatch maintenance ticket.
- Quet marker va thuc hien AR inspection.
- Chay kich ban simulation va inject fault.
- Phan tich AI anomaly va risk scoring.
- Ghi audit trail va gui thong bao van hanh.

Ngoai pham vi da xac nhan:

- Tich hop truc tiep voi trung tam du lieu that.
- ITSM enterprise day du.
- Computer vision nang cao ngoai marker-based AR.
- MLOps production-grade.

## 3. Actor va trach nhiem

| Actor | Loai | Trach nhiem da xac nhan |
| --- | --- | --- |
| System User | Actor tong quat | Dang nhap va ket thuc phien su dung he thong. |
| IT Administrator | Human primary | Quan ly user access, audit trail, node dang ky, marker mapping, alert rule va theo doi tong quan he thong. |
| System Monitoring Operator | Human primary | Quan sat dashboard, xem chi tiet suc khoe tai san, xu ly alert queue, mo incident, dispatch ticket va van hanh simulation. |
| Maintenance Technician | Human primary | Quet marker, xem AR diagnostics, thuc hien inspection va nop ket qua kiem tra. |
| Telemetry Collector | System actor | Stream node telemetry, service/container metadata va network context vao he thong. |
| AI Analytics Service | System actor | Detect anomaly va score risk cho tai san. |
| Notification System | External/system actor | Gui operational notification khi co alert, ticket hoac ket qua inspection. |

## 4. Boi canh nghiep vu tong the

He thong van hanh tren moi truong trung tam du lieu mo phong. Trong quy uoc PoC, `rack` duoc giu nhu mot lop topology ao, `switch` duoc giu nhu mot network asset mo phong/co mot phan behavior, con `node` la server thuc te hoac logical host nhu laptop, VM hoac may khac trong lab. Telemetry Collector thu thap metric va metadata tu node, service/container va network context de day ve backend. Dashboard web cho phep IT Administrator va System Monitoring Operator theo doi suc khoe he thong, chi tiet tai san, alert va lich su telemetry.

Khi canh bao xay ra, System Monitoring Operator xem alert queue, mo incident neu can va giao maintenance ticket cho Maintenance Technician. Technician su dung AR frontend de quet marker, nhan dien tai san, xem overlay chuan doan, log, alert va huong dan bao tri, sau do nop ket qua inspection vao he thong.

Song song, AI Analytics Service phan tich telemetry de phat hien anomaly, cham diem rui ro va lam giau ngu canh xu ly su co. Simulation workflow cung cap du lieu va tinh huong loi de phuc vu demo, kiem thu va nghien cuu.

## 5. Phan ra requirement theo nhom chuc nang

### 5.1 Access control va governance

#### SR-01. Xac thuc nguoi dung

- He thong phai cho phep `System User` dang nhap vao he thong.
- He thong phai xac dinh danh tinh nguoi dung de cap quyen truy cap theo vai tro.
- He thong phai luu duoc thong tin dang nhap phuc vu truy vet van hanh.

#### SR-02. Ket thuc phien su dung

- He thong phai cho phep `System User` ket thuc phien lam viec.
- Sau khi dang xuat, nguoi dung khong duoc tiep tuc su dung cac chuc nang yeu cau xac thuc cua phien truoc.

#### SR-03. Quan ly truy cap nguoi dung

- He thong phai cho phep `IT Administrator` quan ly truy cap nguoi dung.
- Trong pham vi da xac nhan, chuc nang nay bao gom toi thieu viec gan quyen truy cap phu hop cho tung vai tro van hanh.
- He thong phai ghi audit cho cac thao tac thay doi truy cap quan trong.

#### SR-04. Audit trail

- He thong phai ghi nhan nhat ky thao tac doi voi cac hanh dong quan tri va van hanh chinh.
- He thong phai cho phep `IT Administrator` xem audit trail de truy vet actor, doi tuong bi tac dong va thoi diem thao tac.

### 5.2 Platform setup va topology

#### SR-05. Dang ky simulation node

- He thong phai cho phep `IT Administrator` dang ky simulation node vao topology.
- Moi node phai gan voi mot boi canh ha tang phuc vu giam sat va truy xuat AR.

#### SR-06. Quan ly cau truc rack-switch-node-workload

- He thong phai luu va hien thi duoc cau truc rack ao, switch, node va workload `service/container` trong moi truong mo phong.
- He thong phai duy tri quan he giua rack, switch, node va workload de phuc vu dashboard, alert, incident va AR inspection.
- Trong pham vi PoC hien tai, `rack` chu yeu la topology context va aggregation layer; `switch` la network asset dang tiep tuc duoc nghien cuu de mo rong behavior.

#### SR-07. Anh xa marker voi tai san

- He thong phai cho phep `IT Administrator` map marker voi rack, switch hoac node.
- Moi marker phai xac dinh ro doi tuong dich de `Maintenance Technician` co the truy xuat dung tai san khi quet AR.

#### SR-08. Cau hinh alert rule

- He thong phai cho phep `IT Administrator` cau hinh alert rule.
- Alert rule phai ap dung duoc cho cac metric hoac trang thai van hanh lien quan toi rack, switch, node, container hoac service.

### 5.3 Monitoring va observability

#### SR-09. Thu thap node telemetry

- He thong phai nhan va luu node telemetry tu `Telemetry Collector`.
- Node telemetry it nhat phuc vu duoc monitoring health o cap node.

#### SR-10. Thu thap container metadata

- He thong phai nhan va luu container metadata tu `Telemetry Collector`.
- Metadata nay phai duoc dung de hien thi workload context tren dashboard va AR workflow.

#### SR-11. Dashboard realtime

- He thong phai cho phep `IT Administrator` va `System Monitoring Operator` quan sat dashboard realtime.
- Dashboard phai phan anh duoc tinh trang suc khoe ha tang tren cac cap rack, switch, node va workload.

#### SR-12. Xem chi tiet suc khoe tai san

- He thong phai cho phep nguoi van hanh xem chi tiet health cua tai san.
- Chi tiet toi thieu bao gom metric lien quan, service state neu co, risk context va canh bao lien quan.

#### SR-13. Xem lich su telemetry

- He thong phai cho phep `IT Administrator` va `System Monitoring Operator` xem lich su telemetry theo khoang thoi gian.
- Chuc nang nay phai ho tro dieu tra xu huong va doi chieu voi alert, incident hoac simulation event.

### 5.4 AI analytics

#### SR-14. Phat hien anomaly

- He thong phai nhan ket qua `Detect AI Anomaly` tu `AI Analytics Service`.
- Ket qua anomaly phai co kha nang lam giau cho dashboard hoac alert workflow.

#### SR-15. Cham diem rui ro tai san

- He thong phai nhan va hien thi ket qua `Score Asset Health Risk`.
- Risk score phai co the duoc dung trong man hinh dashboard hoac chi tiet tai san de giup uu tien xu ly.

### 5.5 Alert, incident va notification workflow

#### SR-16. Quan sat alert queue

- He thong phai cho phep `System Monitoring Operator` xem danh sach alert can xu ly.
- Alert queue phai cho biet it nhat muc do nghiem trong, tai san bi anh huong va tinh trang xu ly.

#### SR-17. Mo incident record

- He thong phai cho phep `System Monitoring Operator` mo incident record tu alert hoac nhom alert lien quan.
- Incident phai co kha nang dai dien cho mot su co can duoc theo doi vong doi.

#### SR-18. Dieu phoi ticket bao tri

- He thong phai cho phep `System Monitoring Operator` dispatch maintenance ticket.
- Ticket phai co lien ket toi incident va tai san dich de `Maintenance Technician` thuc hien.

#### SR-19. Gui thong bao van hanh

- He thong phai co kha nang `Send Operational Notification`.
- Thong bao phai duoc kich hoat it nhat khi co dispatch ticket hoac nop ket qua inspection, theo cac quan he da xac nhan trong use case diagram.

### 5.6 AR field workflow

#### SR-20. Bat dau AR inspection

- He thong phai cho phep `Maintenance Technician` thuc hien `Conduct AR Inspection`.
- AR inspection la use case tong, bao gom xac dinh tai san, xem diagnostics va nop ket qua kiem tra.

#### SR-21. Nhan dien tai san tu marker

- Trong qua trinh AR inspection, he thong phai cho phep `Identify Asset from Marker`.
- Khi marker hop le, he thong phai tra ve tai san duoc map truoc do.

#### SR-22. Xem AR diagnostics

- Sau khi tai san duoc nhan dien, he thong phai cho phep `Maintenance Technician` xem `Review AR Diagnostics`.
- AR diagnostics phai su dung thong tin chi tiet tai san va canh bao lien quan de ho tro kiem tra tai cho.

#### SR-23. Nop ket qua kiem tra AR

- He thong phai cho phep `Maintenance Technician` thuc hien `Submit AR Inspection Result`.
- Ket qua nop len phai co kha nang lien ket voi ticket, inspection history hoac thong bao van hanh.

### 5.7 Simulation workflow

#### SR-24. Chay kich ban simulation

- He thong phai cho phep `System Monitoring Operator` thuc hien `Run Simulation Scenario`.
- Simulation phai co kha nang tao dong telemetry va metadata phuc vu monitoring.

#### SR-25. Inject fault simulation

- He thong phai cho phep `System Monitoring Operator` thuc hien `Inject Simulation Fault`.
- Fault injection phai co kha nang tao ra bien dong metric, trang thai he thong hoac canh bao phuc vu demo va nghien cuu.

## 6. Functional requirement matrix

| Ma | Nhom | Requirement tom tat | Actor chinh |
| --- | --- | --- | --- |
| SR-01 | Access Control | Dang nhap he thong | System User |
| SR-02 | Access Control | Dang xuat/Ket thuc phien | System User |
| SR-03 | Governance | Quan ly truy cap nguoi dung | IT Administrator |
| SR-04 | Governance | Xem audit trail | IT Administrator |
| SR-05 | Topology | Dang ky simulation node | IT Administrator |
| SR-06 | Topology | Quan ly rack-switch-node-workload | IT Administrator |
| SR-07 | AR Mapping | Map marker voi rack/switch/node | IT Administrator |
| SR-08 | Alerting | Cau hinh alert rule | IT Administrator |
| SR-09 | Telemetry | Nhan node telemetry | Telemetry Collector |
| SR-10 | Telemetry | Nhan container metadata | Telemetry Collector |
| SR-11 | Monitoring | Xem realtime dashboard | IT Administrator, System Monitoring Operator |
| SR-12 | Monitoring | Xem chi tiet health tai san | IT Administrator, System Monitoring Operator |
| SR-13 | Monitoring | Xem lich su telemetry | IT Administrator, System Monitoring Operator |
| SR-14 | AI Analytics | Detect anomaly | AI Analytics Service |
| SR-15 | AI Analytics | Score health risk | AI Analytics Service |
| SR-16 | Alert Workflow | Xem alert queue | System Monitoring Operator |
| SR-17 | Incident Workflow | Mo incident record | System Monitoring Operator |
| SR-18 | Maintenance Workflow | Dispatch maintenance ticket | System Monitoring Operator |
| SR-19 | Notification | Gui operational notification | Notification System |
| SR-20 | AR Workflow | Conduct AR inspection | Maintenance Technician |
| SR-21 | AR Workflow | Identify asset from marker | Maintenance Technician |
| SR-22 | AR Workflow | Review AR diagnostics | Maintenance Technician |
| SR-23 | AR Workflow | Submit AR inspection result | Maintenance Technician |
| SR-24 | Simulation | Run simulation scenario | System Monitoring Operator |
| SR-25 | Simulation | Inject simulation fault | System Monitoring Operator |

## 7. Yeu cau du lieu muc he thong

Du lieu cot loi he thong phai quan ly gom:

### 7.1 Du lieu nhan su va truy cap

- `users`
- `audit_logs`

He thong phai gan duoc moi thao tac quan trong voi actor xac dinh khi actor do da dang nhap.

### 7.2 Du lieu topology va AR context

- `racks`
- `switches`
- `nodes`
- `services`
- `containers`
- `markers`

He thong phai dam bao marker co the tro toi rack, switch hoac node da ton tai. Topology phai duoc to chuc theo quan he rack chua switch va node, node chua service/container, va switch co the lien ket toi node thong qua port/uplink context.

### 7.3 Du lieu monitoring va AI

- `telemetry_samples`
- `service_logs`
- `alert_rules`
- `alerts`
- `ai_models`
- `ai_inferences`

He thong phai luu duoc du lieu theo truc thoi gian de phuc vu dashboard realtime, lich su van hanh, anomaly detection va risk scoring.

### 7.4 Du lieu incident va bao tri

- `incidents`
- `maintenance_tickets`
- `ticket_comments`
- `maintenance_guides`
- `ar_sessions`
- `ar_inspections`

He thong phai duy tri duoc chuoi xu ly tu alert den incident, tu incident den ticket, va tu ticket den inspection result.

### 7.5 Du lieu simulation va thong bao

- `simulation_scenarios`
- `simulation_runs`
- `simulation_events`
- `notification_events`

He thong phai cho phep truy vet duoc su kien simulation lien quan den bien dong monitoring hoac alert neu co.

## 8. Business rules da xac nhan

### 8.1 Quy tac ve vai tro

- `IT Administrator` co trach nhiem quan tri access, topology, marker va alert rule.
- `System Monitoring Operator` co trach nhiem monitoring, alert response, incident handling va ticket dispatch.
- `Maintenance Technician` co trach nhiem thao tac AR inspection va nop ket qua bao tri.

### 8.2 Quy tac ve marker mapping

- Marker chi co y nghia van hanh khi da duoc map voi rack, switch hoac node.
- Qua trinh `Identify Asset from Marker` phu thuoc truc tiep vao mapping nay.

### 8.3 Quy tac ve rack va switch trong PoC

- `Rack` trong PoC duoc giu nhu topology context va aggregation layer, khong bat buoc phai co day du telemetry vat ly nhu PSU, airflow hay PDU.
- `Switch` trong PoC duoc xem la network asset quan trong de giu "chat" mini data center; cac hanh vi toi thieu can co la uplink status, port status, ket noi toi node va alert lien quan.
- Cac nang luc nang cao cua switch nhu VLAN, STP, LACP, SNMP inventory chi duoc xem la huong mo rong va van dang trong qua trinh research.

### 8.4 Quy tac ve workflow alert-incident-ticket

- Alert la diem bat dau cua quy trinh phan ung van hanh.
- Incident duoc mo khi can tap hop va theo doi su co o muc nghiep vu.
- Maintenance ticket duoc dispatch tu incident de technician xu ly tai cho.

### 8.5 Quy tac ve AR workflow

- `Review AR Diagnostics` phu thuoc vao viec tai san da duoc nhan dien tu marker.
- `Submit AR Inspection Result` la buoc ket thuc luong AR inspection da xac nhan.

### 8.6 Quy tac ve simulation

- `Inject Simulation Fault` la use case mo rong cua `Run Simulation Scenario`.
- Simulation co the tao telemetry va metadata de dashboard va pipeline giam sat su dung.

### 8.7 Quy tac ve AI

- `Detect AI Anomaly` mo rong ngu canh `Observe Realtime Dashboard`.
- `Score Asset Health Risk` mo rong ngu canh `Inspect Asset Health Details`.

## 9. Ranh gioi phi chuc nang va gia dinh

Nhung diem sau duoc xem la rang buoc mo ta pham vi, khong duoc dac ta thanh yeu cau phi chuc nang chi tiet trong tai lieu nay:

- Day la proof-of-concept cho moi truong mo phong.
- Chua co cam ket chi tiet ve SLA, latency, throughput hoac HA.
- Chua mo ta chi tiet UI, API contract hay quy tac phan quyen o muc endpoint.
- Chua xac nhan day du kenh thong bao thuc te ngoai notification system abstraction.

## 10. Traceability nguon

### 10.1 Nguon tu use case diagram

Use case diagram xac nhan:

- Actor trong he thong.
- Nhom use case chinh.
- Quan he include, extend va generalize.
- Luong nghiep vu cot loi cua monitoring, AR, incident va simulation.

### 10.2 Nguon tu tai lieu system usecase + MongoDB schema

Tai lieu schema xac nhan:

- Muc tieu PoC va ranh gioi pham vi.
- Use case chi tiet theo actor.
- Tap entity/collection cot loi.
- Quan he du lieu va lifecycle chinh cua alert, incident, ticket va inspection.

## 11. Ket luan

Tap requirement trong tai lieu nay mo ta mot baseline he thong du chi tiet de dung lam nen cho:

- Viet SRS day du hon.
- Tao backlog chuc nang.
- Phan tach module backend/frontend.
- Thiet ke API, schema va RBAC o vong sau.

Pham vi da duoc giu co y o muc "confirmed-only", nghia la uu tien tinh chinh xac va traceable hon la liet ke toi da moi kha nang co the co.
