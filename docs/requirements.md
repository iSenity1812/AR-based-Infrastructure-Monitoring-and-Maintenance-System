# Functional Requirements and Functional Specifications

## 1. Overview

Tai lieu nay duoc phan tich tu [topic_proposal_vn.md](../01_topic_proposal/topic_proposal_vn.md) theo huong business analysis, tap trung chi vao **functional requirements (FR)** cua he thong proof-of-concept AR + AI cho giam sat va bao tri ha tang trong moi truong trung tam du lieu mo phong.

Muc tieu cua tai lieu:

- Chuan hoa danh sach chuc nang nghiep vu cua he thong.
- Dam bao traceability giua requirement va functional specification.
- Lam co so cho use case, backlog, API/module design va phan quyen actor.

## 2. Actors in Scope

| Actor                  | Vai tro nghiep vu                                                        |
| ---------------------- | ------------------------------------------------------------------------ |
| System User            | Actor cha cho cac nguoi dung da xac thuc vao he thong.                   |
| IT Administrator       | Quan tri nen tang, user, role, topology, marker, cau hinh canh bao.      |
| System Monitoring Operator | Giam sat realtime, xu ly alert, incident va dieu phoi van hanh.          |
| Maintenance Technician | Kiem tra tai cho qua AR, xem log, lam theo huong dan va cap nhat ticket. |
| Simulation Operator    | Tao va van hanh cac kich ban mo phong va su kien loi.                    |
| Telemetry Collector    | Thu thap va day telemetry/metadata tu moi truong mo phong vao backend.   |
| AI Analytics Service   | Phan tich bat thuong, cham diem rui ro/suc khoe va tao insight AI.       |
| Notification System    | Phat thong bao den dashboard hoac kenh thong bao duoc cau hinh.          |

## 3. Functional Requirements Catalog

| Requirement Code | Domain                  | Feature Name            | Title                                   | Description                                                                                                        | Business Objective                                                                |
| ---------------- | ----------------------- | ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| FR-01            | Access Control          | Authentication          | User Login                              | He thong cho phep nguoi dung dang nhap bang thong tin xac thuc hop le de truy cap dung chuc nang theo vai tro.     | Bao ve he thong va dam bao moi thao tac duoc gan voi danh tinh hop le.            |
| FR-02            | Access Control          | Session Management      | User Logout                             | He thong cho phep nguoi dung dang xuat va ket thuc phien lam viec hien tai.                                        | Giam rui ro truy cap trai phep va dam bao an toan van hanh.                       |
| FR-03            | Access Control          | User Management         | Manage User Accounts                    | IT Administrator co the tao, cap nhat, khoa hoac kich hoat tai khoan nguoi dung.                                   | Ho tro quan ly vong doi tai khoan trong moi truong demo/van hanh.                 |
| FR-04            | Access Control          | Role Management         | Assign Roles and Permissions            | IT Administrator co the gan vai tro va quyen truy cap cho tai khoan nguoi dung.                                    | Dam bao phan quyen phu hop voi trach nhiem van hanh cua tung actor.               |
| FR-05            | Governance              | Audit Logging           | View Audit History                      | He thong ghi nhan va cho phep IT Administrator xem lich su thao tac quan tri va van hanh quan trong.               | Ho tro truy vet thay doi, kiem soat van hanh va bao cao nghiep vu.                |
| FR-06            | Infrastructure Topology | Rack Management         | Manage Simulated Racks                  | IT Administrator co the tao, cap nhat va quan ly thong tin rack trong moi truong mo phong.                         | Tao lop cau truc vat ly co y nghia cho dashboard va AR mapping.                   |
| FR-07            | Infrastructure Topology | Node Management         | Manage Simulated Nodes                  | IT Administrator co the dang ky, cap nhat va gan node vao rack tuong ung.                                          | Quan ly don vi ha tang cot loi de giam sat va bao tri.                            |
| FR-08            | Infrastructure Topology | Container Inventory     | Synchronize Container/Service Inventory | He thong dong bo va hien thi danh sach container/service dang chay tren tung node.                                 | Duy tri tam nhin day du giua ha tang vat ly mo phong va workload van hanh.        |
| FR-09            | AR Mapping              | Marker Management       | Register and Map AR Markers             | IT Administrator co the tao marker va anh xa marker voi rack hoac node cu the.                                     | Cho phep AR frontend truy xuat dung tai san khi nguoi dung quet marker.           |
| FR-10            | Infrastructure Topology | Topology Visualization  | View Rack-Node-Container Topology       | He thong hien thi so do quan he giua rack, node, container va marker tren dashboard.                               | Giup nguoi van hanh hieu nhanh cau truc he thong va boi canh canh bao.            |
| FR-11            | Simulation              | Scenario Definition     | Create Simulation Scenarios             | Simulation Operator co the tao kich ban mo phong gom topology logic, workload va hanh vi su kien.                  | Ho tro demo, nghien cuu va thu nghiem cac tinh huong van hanh lap lai duoc.       |
| FR-12            | Simulation              | Run Control             | Start, Stop and Reset Simulation Runs   | Simulation Operator co the khoi dong, tam dung, dung va reset mot lan chay mo phong.                               | Cho phep dieu khien moi truong mo phong de tao ngu canh giam sat/bao tri.         |
| FR-13            | Simulation              | Fault Injection         | Inject Simulation Fault Events          | Simulation Operator co the kich hoat cac su kien loi nhu CPU spike, memory leak, service down hoac network issue.  | Tao du lieu su co co chu dich de danh gia dashboard, AR va AI.                    |
| FR-14            | Telemetry Pipeline      | Telemetry Ingestion     | Collect Node Telemetry                  | Telemetry Collector gui metric CPU, memory, storage va network tu cac node mo phong ve backend.                    | Cung cap nguon du lieu realtime cho giam sat va phan tich.                        |
| FR-15            | Telemetry Pipeline      | Metadata Ingestion      | Collect Container Metadata              | Telemetry Collector gui metadata va trang thai container/service ve backend.                                       | Bo sung ngu canh workload de phan tich va canh bao chinh xac hon.                 |
| FR-16            | Monitoring              | Realtime Dashboard      | View Realtime Infrastructure Dashboard  | IT Administrator va System Monitoring Operator co the xem dashboard realtime ve suc khoe ha tang, metric va trang thai service.  | Ho tro giam sat tap trung va phat hien nhanh van de.                              |
| FR-17            | Monitoring              | Filtering and Search    | Filter Monitoring Data by Asset         | System Monitoring Operator va IT Administrator co the loc du lieu theo rack, node, container, trang thai hoac muc do uu tien.    | Giam nhieu thong tin va rut ngan thoi gian xac dinh pham vi su co.                |
| FR-18            | Monitoring              | Detail Inspection       | View Node and Container Details         | He thong cho phep xem chi tiet node/container bao gom metric, service state va thong tin lien quan.                | Ho tro phan tich nguyen nhan va danh gia anh huong tai muc tai san.               |
| FR-19            | Monitoring              | Historical Analysis     | View Historical Telemetry and Logs      | He thong cho phep tra cuu lich su telemetry, log va bien dong trang thai theo khoang thoi gian.                    | Ho tro dieu tra su co va so sanh xu huong van hanh.                               |
| FR-20            | Alerting                | Rule Configuration      | Configure Alert Rules                   | IT Administrator co the dinh nghia va cap nhat rule canh bao dua tren nguong metric hoac trang thai service.       | Kich hoat co che canh bao phu hop voi moi truong mo phong va muc tieu demo.       |
| FR-21            | Alerting                | Threshold Alerts        | Generate Threshold-Based Alerts         | He thong tu dong tao alert khi metric vuot nguong hoac service chuyen sang trang thai bat thuong.                  | Phat hien som van de van hanh can su chu y cua NOC.                               |
| FR-22            | AI Analytics            | Anomaly Detection       | Detect Telemetry Anomalies              | AI Analytics Service phan tich telemetry da thu thap de phat hien hanh vi bat thuong vuot qua logic nguong co ban. | Tang gia tri nghien cuu va nang cao kha nang phat hien su co.                     |
| FR-23            | AI Analytics            | Health and Risk Scoring | Calculate Health/Risk Scores            | AI Analytics Service tinh diem suc khoe hoac rui ro cho node, container hoac su kien.                              | Lam giau thong tin canh bao va ho tro uu tien xu ly.                              |
| FR-24            | Alerting                | Alert Triage            | Review and Acknowledge Alerts           | System Monitoring Operator co the xem chi tiet, danh dau acknowledge va cap nhat trang thai xu ly cua alert.                     | Tranh bo sot su kien va kiem soat vong doi alert ro rang.                         |
| FR-25            | Incident Management     | Incident Lifecycle      | Create and Track Incidents              | System Monitoring Operator co the tao incident tu alert va theo doi tien do xu ly.                                               | Chuan hoa xu ly cac su co can dieu phoi nghiep vu.                                |
| FR-26            | Maintenance Workflow    | Ticket Management       | Create and Assign Maintenance Tickets   | System Monitoring Operator co the tao ticket bao tri tu incident va gan cho Maintenance Technician.                              | Ket noi giam sat trung tam voi hoat dong kiem tra/bao tri tai cho.                |
| FR-27            | Maintenance Workflow    | Ticket Status           | Update Ticket Execution Status          | Maintenance Technician co the cap nhat trang thai ticket nhu in progress, escalated, resolved kem ghi chu.         | Theo doi minh bach qua trinh bao tri va trang thai xu ly thuc te.                 |
| FR-28            | Notification            | Event Notification      | Deliver Operational Notifications       | Notification System gui thong bao ve alert, incident va ticket den dung doi tuong.                                 | Tang kha nang phan hoi kip thoi va dong bo thong tin giua cac vai tro.            |
| FR-29            | AR Operations           | AR Session              | Start AR Inspection Session             | Maintenance Technician co the mo mot phien AR de thuc hien kiem tra theo ngu canh tai cho.                         | Khoi tao quy trinh thao tac tai hien truong bang giao dien AR.                    |
| FR-30            | AR Operations           | Marker Scan             | Scan Marker and Identify Asset          | Maintenance Technician co the quet marker de xac dinh rack/node tuong ung trong he thong.                          | Rut ngan thoi gian anh xa giua tai san vat ly va du lieu so.                      |
| FR-31            | AR Operations           | AR Overlay              | Display Contextual AR Overlay           | He thong hien thi overlay tren AR gom dinh danh node, suc khoe, service state va workload lien quan.               | Cung cap thong tin van hanh ngay tai diem bao tri ma khong can quay ve dashboard. |
| FR-32            | AR Operations           | Contextual Diagnostics  | View Alerts and Logs in AR              | Maintenance Technician co the xem alert dang mo, log gan day va ghi chu van hanh trong giao dien AR.               | Ho tro chan doan nhanh tai cho voi du lieu theo ngu canh.                         |
| FR-33            | AR Operations           | Guided Remediation      | View AR Remediation Guidance            | He thong cung cap huong dan thao tac hoac checklist bao tri dua tren loai su co hay trang thai node.               | Giam phu thuoc vao kinh nghiem ca nhan va chuan hoa xu ly.                        |
| FR-34            | AR Operations           | Inspection Submission   | Submit AR Inspection Result             | Maintenance Technician co the gui ket qua kiem tra, bang chung va cap nhat lien quan den ticket tu giao dien AR.   | Dong bo thong tin hien truong vao quy trinh van hanh trung tam.                   |
| FR-35            | Reporting               | Operational Reporting   | Generate Operational Reports            | He thong cho phep IT Administrator hoac System Monitoring Operator xem/xuat bao cao ve telemetry, alert, incident va ticket.     | Ho tro tong hop ket qua demo, danh gia van hanh va trinh bay nghien cuu.          |
| FR-36            | AI Analytics            | Predictive Insight      | Provide Predictive Trend Insights       | He thong cung cap du bao xu huong ngan han hoac insight rui ro dua tren telemetry lich su.                         | Minh hoa gia tri mo rong cua AI doi voi lap ke hoach bao tri du doan.             |

## 4. Functional Specifications

### FS-01

- Spec code: FS-01
- Requirement code: FR-01
- Actor: System User
- Trigger: Nguoi dung truy cap man hinh dang nhap va gui thong tin xac thuc.
- Preconditions: Tai khoan da ton tai va dang hoat dong.
- Main flow: Nguoi dung nhap thong tin dang nhap; he thong xac thuc; he thong tao phien dang nhap va dieu huong den giao dien dung vai tro.
- Alternative flow: Thong tin sai hoac tai khoan bi khoa thi he thong tu choi dang nhap va thong bao ly do phu hop.
- Postcondition: Phien dang nhap hop le duoc tao hoac yeu cau dang nhap bi tu choi.

### FS-02

- Spec code: FS-02
- Requirement code: FR-02
- Actor: System User
- Trigger: Nguoi dung chon chuc nang dang xuat.
- Preconditions: Nguoi dung dang co phien dang nhap hop le.
- Main flow: He thong nhan yeu cau dang xuat; huy phien hien tai; dua nguoi dung ve man hinh dang nhap.
- Alternative flow: Neu phien het han, he thong tu dong ket thuc phien va yeu cau dang nhap lai.
- Postcondition: Phien lam viec khong con hieu luc.

### FS-03

- Spec code: FS-03
- Requirement code: FR-03
- Actor: IT Administrator
- Trigger: Quan tri vien mo chuc nang quan ly nguoi dung.
- Preconditions: Quan tri vien da dang nhap va co quyen quan ly tai khoan.
- Main flow: Quan tri vien tao moi hoac cap nhat tai khoan; he thong luu thong tin; he thong cap nhat trang thai tai khoan.
- Alternative flow: Neu tai khoan trung dinh danh hoac du lieu khong hop le, he thong tu choi luu va hien loi.
- Postcondition: Tai khoan duoc tao/cap nhat/khoa thanh cong hoac giu nguyen neu that bai.

### FS-04

- Spec code: FS-04
- Requirement code: FR-04
- Actor: IT Administrator
- Trigger: Quan tri vien chon mot tai khoan de gan vai tro.
- Preconditions: Tai khoan muc tieu da ton tai.
- Main flow: Quan tri vien chon vai tro/quyen; he thong kiem tra hop le; he thong luu cau hinh phan quyen.
- Alternative flow: Neu vai tro khong hop le hoac vuot quyen cap phat, he thong khong cho phep cap nhat.
- Postcondition: Quyen truy cap cua tai khoan duoc cap nhat.

### FS-05

- Spec code: FS-05
- Requirement code: FR-05
- Actor: IT Administrator
- Trigger: Quan tri vien truy cap man hinh audit log.
- Preconditions: Da co nhat ky thao tac trong he thong.
- Main flow: He thong tai danh sach ban ghi; cho phep loc theo actor, thoi gian, doi tuong; hien thi chi tiet thay doi.
- Alternative flow: Neu khong co du lieu phu hop, he thong hien trang thai rong.
- Postcondition: Quan tri vien xem duoc lich su thao tac phuc vu truy vet.

### FS-06

- Spec code: FS-06
- Requirement code: FR-06
- Actor: IT Administrator
- Trigger: Quan tri vien mo module quan ly rack.
- Preconditions: Quan tri vien co quyen quan ly topology.
- Main flow: Quan tri vien tao/sua thong tin rack; he thong luu ma rack, vi tri va metadata lien quan; he thong cap nhat topology.
- Alternative flow: Neu ma rack bi trung hoac du lieu thieu, he thong tu choi luu.
- Postcondition: Rack mo phong duoc tao hoac cap nhat thanh cong.

### FS-07

- Spec code: FS-07
- Requirement code: FR-07
- Actor: IT Administrator
- Trigger: Quan tri vien tao moi hoac chinh sua node.
- Preconditions: Rack dich da ton tai.
- Main flow: Quan tri vien nhap thong tin node; gan node vao rack; he thong luu node va cap nhat lien ket topology.
- Alternative flow: Neu rack dich khong ton tai hoac node code bi trung, he thong tu choi thao tac.
- Postcondition: Node ton tai hop le trong topology he thong.

### FS-08

- Spec code: FS-08
- Requirement code: FR-08
- Actor: Telemetry Collector
- Trigger: He thong nhan duoc metadata workload/container tu moi truong mo phong.
- Preconditions: Node nguon da duoc dang ky trong he thong.
- Main flow: Telemetry Collector gui danh sach container/service; backend doi chieu node; cap nhat ton kho container va trang thai.
- Alternative flow: Neu node chua duoc dang ky, he thong danh dau ban ghi cho dong bo sau hoac tu choi theo cau hinh.
- Postcondition: Danh muc workload theo node duoc cap nhat.

### FS-09

- Spec code: FS-09
- Requirement code: FR-09
- Actor: IT Administrator
- Trigger: Quan tri vien tao marker moi hoac cap nhat mapping.
- Preconditions: Rack hoac node dich da ton tai.
- Main flow: Quan tri vien nhap marker code; chon doi tuong anh xa; he thong luu quan he marker-tai san.
- Alternative flow: Neu marker da duoc su dung hoac doi tuong dich khong hop le, he thong tu choi luu.
- Postcondition: Marker co mapping hop le phuc vu AR.

### FS-10

- Spec code: FS-10
- Requirement code: FR-10
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung mo man hinh topology.
- Preconditions: Da co du lieu rack, node, container va marker.
- Main flow: He thong tai cau truc rack-node-container; trinh bay so do va cac lien ket; cho phep xem nhanh trang thai tung thanh phan.
- Alternative flow: Neu topology chua day du, he thong hien thi thanh phan da co va danh dau noi dung con thieu.
- Postcondition: Nguoi dung co tam nhin tong quan cau truc ha tang mo phong.

### FS-11

- Spec code: FS-11
- Requirement code: FR-11
- Actor: Simulation Operator
- Trigger: Nguoi dung chon tao kich ban mo phong.
- Preconditions: Nguoi dung co quyen quan ly simulation.
- Main flow: Nguoi dung nhap ten kich ban, thong so workload va su kien; he thong luu scenario de co the tai su dung.
- Alternative flow: Neu thong so kich ban khong hop le, he thong tu choi luu va yeu cau dieu chinh.
- Postcondition: Mot simulation scenario moi duoc tao.

### FS-12

- Spec code: FS-12
- Requirement code: FR-12
- Actor: Simulation Operator
- Trigger: Nguoi dung chon start, stop, pause hoac reset cho mot scenario.
- Preconditions: Scenario da ton tai.
- Main flow: He thong thuc thi lenh dieu khien run; cap nhat trang thai run; ghi nhan moc thoi gian va su kien van hanh.
- Alternative flow: Neu run dang o trang thai khong cho phep chuyen doi, he thong tu choi thao tac.
- Postcondition: Simulation run duoc dieu khien theo lenh hop le.

### FS-13

- Spec code: FS-13
- Requirement code: FR-13
- Actor: Simulation Operator
- Trigger: Nguoi dung chon inject mot fault event.
- Preconditions: Dang co simulation run hoat dong hoac moi truong mo phong san sang.
- Main flow: Nguoi dung chon loai loi va muc tieu; he thong kich hoat su kien; telemetry va trang thai lien quan thay doi theo kich ban.
- Alternative flow: Neu node dich khong ton tai hoac fault khong ho tro, he thong tu choi inject.
- Postcondition: Su kien loi mo phong duoc ap dung cho moi truong.

### FS-14

- Spec code: FS-14
- Requirement code: FR-14
- Actor: Telemetry Collector
- Trigger: Den chu ky thu thap metric hoac co su kien push telemetry.
- Preconditions: Collector dang ket noi duoc toi backend.
- Main flow: Collector thu metric node; dong goi du lieu; gui den backend; backend luu va dua vao pipeline monitoring.
- Alternative flow: Neu backend tam thoi khong san sang, collector thu lai hoac dua vao hang doi theo cau hinh.
- Postcondition: Telemetry node duoc ghi nhan trong he thong.

### FS-15

- Spec code: FS-15
- Requirement code: FR-15
- Actor: Telemetry Collector
- Trigger: Den chu ky dong bo metadata container hoac co thay doi trang thai service.
- Preconditions: Collector truy cap duoc thong tin workload tren node mo phong.
- Main flow: Collector lay metadata container; gui den backend; backend cap nhat inventory va service state.
- Alternative flow: Neu mot phan metadata khong hop le, he thong bo qua ban ghi loi va tiep tuc xu ly ban ghi hop le.
- Postcondition: Metadata container phan anh trang thai gan nhat cua moi truong mo phong.

### FS-16

- Spec code: FS-16
- Requirement code: FR-16
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung mo dashboard monitoring.
- Preconditions: He thong da nhan telemetry hop le.
- Main flow: He thong tong hop metric realtime, suc khoe node/container va su kien mo; hien thi tren dashboard trung tam.
- Alternative flow: Neu nguon du lieu tam thoi cham, he thong hien thi moc cap nhat gan nhat va trang thai stale data.
- Postcondition: Nguoi dung xem duoc tinh trang van hanh hien tai.

### FS-17

- Spec code: FS-17
- Requirement code: FR-17
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung ap bo loc tren dashboard.
- Preconditions: Du lieu monitoring da duoc tai.
- Main flow: Nguoi dung chon rack/node/container/trang thai; he thong loc du lieu va cap nhat danh sach/bieu do lien quan.
- Alternative flow: Neu bo loc khong tra ve ket qua, he thong hien trang thai rong.
- Postcondition: Khung nhin monitoring duoc thu hep theo doi tuong quan tam.

### FS-18

- Spec code: FS-18
- Requirement code: FR-18
- Actor: IT Administrator, System Monitoring Operator, Maintenance Technician
- Trigger: Nguoi dung mo chi tiet mot node hoac container.
- Preconditions: Doi tuong dich da ton tai trong he thong.
- Main flow: He thong hien metric, service state, health score, alert lien quan va metadata cua doi tuong duoc chon.
- Alternative flow: Neu doi tuong vua bi xoa hoac mat ket noi, he thong thong bao khong the tai chi tiet.
- Postcondition: Nguoi dung co day du ngu canh chi tiet de phan tich.

### FS-19

- Spec code: FS-19
- Requirement code: FR-19
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung chon khoang thoi gian lich su cho metric/log.
- Preconditions: Du lieu lich su da duoc luu tru.
- Main flow: He thong truy van telemetry, log va bien dong trang thai theo khoang thoi gian; hien thi du lieu phuc vu phan tich.
- Alternative flow: Neu khoang thoi gian qua rong hoac khong co du lieu, he thong thong bao phu hop.
- Postcondition: Nguoi dung xem duoc lich su van hanh cua doi tuong quan tam.

### FS-20

- Spec code: FS-20
- Requirement code: FR-20
- Actor: IT Administrator
- Trigger: Quan tri vien tao hoac sua alert rule.
- Preconditions: Da xac dinh metric hoac service state muc tieu.
- Main flow: Quan tri vien nhap dieu kien, nguong va pham vi ap dung; he thong luu rule va kich hoat cho pipeline giam sat.
- Alternative flow: Neu cau hinh khong hop le, he thong khong cho luu.
- Postcondition: Alert rule moi co hieu luc trong he thong.

### FS-21

- Spec code: FS-21
- Requirement code: FR-21
- Actor: System
- Trigger: Metric hoac service state vi pham rule da cau hinh.
- Preconditions: Alert rule dang hoat dong va du lieu dau vao da den backend.
- Main flow: He thong danh gia rule; tao alert; gan severity, timestamp va doi tuong bi anh huong.
- Alternative flow: Neu su kien trung lap theo cua so thoi gian, he thong co the hop nhat hoac cap nhat alert hien co.
- Postcondition: Alert threshold-based duoc tao san sang cho System Monitoring Operator xu ly.

### FS-22

- Spec code: FS-22
- Requirement code: FR-22
- Actor: AI Analytics Service
- Trigger: Co du lieu telemetry moi du cho phan tich AI.
- Preconditions: AI pipeline dang san sang va model phu hop da duoc nap.
- Main flow: AI service nhan telemetry; chay mo hinh phat hien bat thuong; tra ve anomaly score va evidence lien quan.
- Alternative flow: Neu model tam thoi khong san sang, he thong danh dau phien phan tich bi bo qua ma khong chan monitoring co ban.
- Postcondition: Ket qua anomaly duoc sinh ra de lam giau monitoring/alert.

### FS-23

- Spec code: FS-23
- Requirement code: FR-23
- Actor: AI Analytics Service
- Trigger: Sau khi telemetry hoac anomaly result duoc xu ly.
- Preconditions: Du lieu ngu canh cho doi tuong muc tieu da san co.
- Main flow: AI service tinh health/risk score cho node hoac container; gui ket qua cho dashboard va alert enrichment.
- Alternative flow: Neu thieu du lieu can thiet, he thong bo qua tinh diem va danh dau score unavailable.
- Postcondition: Doi tuong duoc gan diem suc khoe/rui ro cap nhat.

### FS-24

- Spec code: FS-24
- Requirement code: FR-24
- Actor: System Monitoring Operator
- Trigger: System Monitoring Operator mo mot alert de xem va xu ly.
- Preconditions: Alert ton tai va chua dong.
- Main flow: System Monitoring Operator xem chi tiet alert; danh dau acknowledge; cap nhat ghi chu hoac phan loai muc do can theo doi.
- Alternative flow: Neu alert da duoc nguoi khac dong hoac incident hoa, he thong hien trang thai moi nhat.
- Postcondition: Alert co trang thai xu ly ro rang cho toan bo doi van hanh.

### FS-25

- Spec code: FS-25
- Requirement code: FR-25
- Actor: System Monitoring Operator
- Trigger: System Monitoring Operator quyet dinh nang cap mot hoac nhieu alert thanh incident.
- Preconditions: Alert lien quan da ton tai.
- Main flow: System Monitoring Operator tao incident; lien ket alert nguon; dat muc uu tien, mo ta va trang thai; theo doi tien do xu ly.
- Alternative flow: Neu incident cho cung mot su kien da ton tai, he thong cho phep lien ket alert vao incident hien co.
- Postcondition: Incident duoc tao va dua vao quy trinh dieu phoi.

### FS-26

- Spec code: FS-26
- Requirement code: FR-26
- Actor: System Monitoring Operator
- Trigger: Incident can kiem tra hoac xu ly tai cho.
- Preconditions: Incident da duoc mo.
- Main flow: System Monitoring Operator tao ticket; gan ticket voi incident va node dich; chi dinh Maintenance Technician; he thong thong bao nguoi duoc giao.
- Alternative flow: Neu chua co technician phu hop, he thong cho phep tao ticket o trang thai unassigned.
- Postcondition: Ticket bao tri ton tai va san sang de thuc thi.

### FS-27

- Spec code: FS-27
- Requirement code: FR-27
- Actor: Maintenance Technician
- Trigger: Technician thao tac tren ticket duoc giao.
- Preconditions: Ticket ton tai va technician co quyen truy cap.
- Main flow: Technician cap nhat trang thai, ghi chu va ket qua xu ly; he thong luu lich su cap nhat.
- Alternative flow: Neu ticket da dong hoac technician khong duoc phan cong, he thong tu choi cap nhat.
- Postcondition: Tien do thuc thi ticket duoc dong bo trong he thong.

### FS-28

- Spec code: FS-28
- Requirement code: FR-28
- Actor: Notification System
- Trigger: He thong phat sinh alert, incident, assignment hoac cap nhat ticket.
- Preconditions: Su kien thong bao hop le da duoc tao.
- Main flow: Notification System nhan su kien; xac dinh doi tuong nhan; phat thong bao toi dashboard hoac kenh da cau hinh.
- Alternative flow: Neu kenh gui that bai, he thong ghi nhan trang thai loi de retry hoac theo doi.
- Postcondition: Trang thai thong bao duoc ghi nhan va doi tuong nhan co the tiep can thong tin moi.

### FS-29

- Spec code: FS-29
- Requirement code: FR-29
- Actor: Maintenance Technician
- Trigger: Technician mo AR frontend de bat dau kiem tra.
- Preconditions: Technician da dang nhap va thiet bi AR/browser ho tro session.
- Main flow: He thong khoi tao AR session; tai cau hinh marker va ngu canh can thiet; san sang cho thao tac quet.
- Alternative flow: Neu thiet bi khong ho tro AR hoac khong cap quyen camera, he thong thong bao khong the bat dau session.
- Postcondition: Mot AR inspection session duoc mo.

### FS-30

- Spec code: FS-30
- Requirement code: FR-30
- Actor: Maintenance Technician
- Trigger: Technician huong camera vao marker.
- Preconditions: AR session dang hoat dong va marker da duoc dang ky.
- Main flow: He thong nhan dien marker; doi chieu mapping; tra ve rack/node tuong ung cho frontend.
- Alternative flow: Neu marker khong hop le hoac chua mapping, he thong thong bao khong nhan dien duoc tai san.
- Postcondition: Tai san dich duoc xac dinh trong AR session.

### FS-31

- Spec code: FS-31
- Requirement code: FR-31
- Actor: Maintenance Technician
- Trigger: Sau khi marker duoc nhan dien thanh cong.
- Preconditions: Tai san dich da ton tai va co du lieu monitoring.
- Main flow: He thong tai thong tin node/service/health/workload; render overlay 2D/AR tren boi canh marker.
- Alternative flow: Neu du lieu monitoring tam thoi khong san co, he thong van hien thi dinh danh tai san va thong bao du lieu chua san sang.
- Postcondition: Overlay AR theo ngu canh duoc hien thi cho technician.

### FS-32

- Spec code: FS-32
- Requirement code: FR-32
- Actor: Maintenance Technician
- Trigger: Technician chon xem alert/log trong giao dien AR.
- Preconditions: Da co doi tuong node/container duoc nhan dien.
- Main flow: He thong tai alert dang mo, log gan day va ghi chu lien quan; hien thi trong giao dien AR theo ngu canh.
- Alternative flow: Neu khong co alert hoac log, he thong hien thi thong diep phu hop.
- Postcondition: Technician co them du lieu chan doan ngay trong AR session.

### FS-33

- Spec code: FS-33
- Requirement code: FR-33
- Actor: Maintenance Technician
- Trigger: Technician mo huong dan xu ly cho doi tuong dang kiem tra.
- Preconditions: Da xac dinh loai su co hoac ngu canh node/service.
- Main flow: He thong doi chieu incident/alert/trang thai voi tap huong dan; hien checklist hoac buoc khuyen nghi.
- Alternative flow: Neu chua co huong dan phu hop, he thong thong bao khong co remediation template.
- Postcondition: Technician nhan duoc huong dan thao tac theo ngu canh.

### FS-34

- Spec code: FS-34
- Requirement code: FR-34
- Actor: Maintenance Technician
- Trigger: Technician gui ket qua inspection tu AR frontend.
- Preconditions: Dang co ticket hoac phien inspection hop le.
- Main flow: Technician nhap ghi chu, bang chung, ket qua xu ly; he thong luu inspection result va dong bo ve ticket/incident lien quan.
- Alternative flow: Neu du lieu gui len thieu thong tin bat buoc, he thong tu choi luu va yeu cau bo sung.
- Postcondition: Ket qua kiem tra tai cho duoc luu trong he thong.

### FS-35

- Spec code: FS-35
- Requirement code: FR-35
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung chon tao bao cao.
- Preconditions: Da co du lieu telemetry, alert, incident hoac ticket trong khoang thoi gian duoc chon.
- Main flow: He thong tong hop du lieu theo tham so bao cao; hien thi hoac xuat bao cao tong quan van hanh.
- Alternative flow: Neu khoang thoi gian khong co du lieu, he thong thong bao bao cao rong.
- Postcondition: Bao cao van hanh duoc tao cho muc dich theo doi hoac demo.

### FS-36

- Spec code: FS-36
- Requirement code: FR-36
- Actor: IT Administrator, System Monitoring Operator
- Trigger: Nguoi dung mo khu vuc AI insight hoac he thong tu dong cap nhat du bao.
- Preconditions: Da co du lieu lich su toi thieu va AI pipeline du bao san sang.
- Main flow: He thong tao insight xu huong ngan han hoac canh bao rui ro du doan; hien thi ket qua cung doi tuong lien quan.
- Alternative flow: Neu khong du du lieu de du bao, he thong hien thi trang thai unavailable thay vi tra ve ket qua khong tin cay.
- Postcondition: Nguoi dung nhan duoc thong tin du doan phuc vu uu tien bao tri.

## 5. Traceability Notes

- FR-01 den FR-05: Nhom Access Control va Governance.
- FR-06 den FR-10: Nhom Topology, Asset va Marker Mapping.
- FR-11 den FR-13: Nhom Simulation Control.
- FR-14 den FR-19: Nhom Telemetry va Monitoring.
- FR-20 den FR-24: Nhom Alerting va AI Enrichment.
- FR-25 den FR-28: Nhom Incident, Ticket va Notification.
- FR-29 den FR-34: Nhom AR Maintenance Workflow.
- FR-35 den FR-36: Nhom Reporting va Predictive Insight.

## 6. Scope Clarification

- Day la **functional requirements**; khong bao gom non-functional requirements nhu performance, security SLA, availability hay scalability.
- FR-36 la chuc nang mo rong theo dung tinh chat de tai: AI predictive insight duoc xac dinh la nang cao, nhung van la chuc nang nghiep vu hop le trong pham vi PoC.
- Tai lieu uu tien tinh traceable va kha dung cho SRS/use case; vi vay ten feature va mo ta duoc viet o muc do vua du de doi chieu sang backlog, API va screen flow.
