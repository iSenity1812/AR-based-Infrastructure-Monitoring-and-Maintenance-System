# Asset Management Business Lifecycle

## 1. Muc dich tai lieu

Tai lieu nay mo ta `Asset Management` theo goc nhin `business va van hanh` cho `Asset Context Service`.
Muc tieu la de bat ky ai doc tai lieu nay deu hieu ro:

- he thong dang quan ly nhung asset nao
- y nghia nghiep vu cua `rack`, `node`, `marker`
- vong doi day du cua tung loai asset
- cac quy trinh quan ly asset can co trong he thong
- ai duoc phep thao tac o buoc nao
- ket qua mong doi cua tung quy trinh

Tai lieu nay co y dung ngon ngu cu the, de hieu, tranh dien dat qua tru tuong.

## 2. Pham vi asset management trong giai doan hien tai

Trong phase hien tai, `Asset Management` cua du an gom 3 doi tuong chinh:

- `Rack`
- `Node`
- `Marker`

`Container` va workload runtime khong nam trong authoritative asset boundary.
No la du lieu van hanh duoc compose tu monitoring/workload boundary khi can.

## 3. Asset management la gi trong du an nay

Trong du an nay, `Asset Management` khong chi la tao record cho asset.
No la toan bo quy trinh de:

- dua asset vao he thong
- sap xep dung vi tri trong topology
- kiem tra asset co hop le de van hanh khong
- lien ket asset voi AR marker
- cap nhat thay doi trong qua trinh van hanh
- ngung su dung asset mot cach co kiem soat
- giu lich su de truy vet va bao cao

Noi don gian, asset management phai giup he thong tra loi duoc 5 cau hoi:

1. Day la asset gi?
2. Asset nay dang nam o dau?
3. Asset nay da san sang dua vao van hanh chua?
4. Asset nay co dang duoc su dung dung boi canh khong?
5. Asset nay co the duoc truy cap qua AR khong?

## 4. Cach hieu topology trong phase nay

Trong phase nay da bo `switch`, nen `topology` khong duoc hieu la `network topology`.
Topology o day duoc hieu la `cau truc quan he va vi tri cua asset`.

Topology hien tai chi can mo ta 3 quan he co ban:

- `rack` la asset cap cha
- `node` nam ben trong `rack`
- `marker` duoc gan vao `rack` hoac `node`

Y nghia nghiep vu cua topology:

- biet node nao thuoc rack nao
- biet rack nao dang chua nhung node nao
- biet marker nao dang dai dien cho asset nao
- biet khi scan marker thi phai mo dung asset context nao
- biet khi di chuyen node thi quan he asset thay doi ra sao

Neu khong co topology, he thong chi con cac asset roi rac.
Khi do dashboard, AR va workflow van hanh se khong co chung mot boi canh.

## 5. Vai tro cua tung asset

### 5.1 Rack

`Rack` la lop topology cao nhat trong phase hien tai.
No dong vai tro la khung vat ly/logic chua node.

Rack duoc dung de:

- to chuc asset trong he thong
- dinh nghia boi canh vi tri cho node
- lam diem vao tong quan cho dashboard
- lam anchor cap cao cho luong AR neu can scan rack truoc roi moi xem node

### 5.2 Node

`Node` la asset van hanh trung tam.
No la host, may chu logic, may mo phong hoac thiet bi tinh toan ma he thong theo doi.

Node duoc dung de:

- gan voi telemetry va monitoring context
- nam trong mot rack cu the
- tro thanh diem lien ket giua asset topology va workload runtime
- tro thanh doi tuong chinh de technician xem trong AR

### 5.3 Marker

`Marker` la image target vat ly duoc dan/gia tri hoa tren `rack` hoac `node`.
No khong phai asset van hanh doc lap.
No la `diem neo AR` de bien mot asset thanh mot doi tuong co the scan va thao tac tai cho.

Marker duoc dung de:

- resolve asset context tu camera scan
- mo dung boi canh AR cho technician
- tranh viec nguoi dung phai tim asset bang tay trong hien truong

## 6. Vai tro cua nguoi dung trong asset management

### 6.1 IT Administrator

La role chinh quan ly asset.
Role nay duoc phep:

- tao va cap nhat rack
- xac nhan rack san sang van hanh
- phe duyet hoac dieu chinh thong tin node
- gan node vao rack
- di chuyen node giua cac rack
- tao, map, activate, remap, retire marker
- dua rack/node vao draining hoac retired

### 6.2 System Monitoring Operator

Khong so huu asset truth, nhung can dung asset context de van hanh.
Role nay duoc phep:

- xem topology
- xac minh boi canh node trong qua trinh monitoring
- kiem tra marker dang map vao asset nao
- phat hien bat thuong du lieu asset de yeu cau admin cap nhat

### 6.3 Maintenance Technician

Khong tao hay sua asset.
Role nay dung asset o goc nhin thao tac hien truong.
Role nay duoc phep:

- scan marker
- xem rack/node context trong AR
- phan hoi neu marker scan sai hoac asset context khong dung

## 7. Nguyen tac chung cua asset management

### 7.1 Khong tao asset cho vui

Moi rack, node, marker deu phai co y nghia nghiep vu ro rang.
Neu mot asset duoc tao ma khong co vai tro trong topology hoac AR context, do la du lieu thua.

### 7.2 Tach ro khai bao, xac nhan, va dua vao van hanh

Khong nen coi asset vua tao la da dung duoc ngay.
Can co buoc xac nhan va buoc dua vao van hanh de tranh sai sot.

### 7.3 Tach ro lifecycle va runtime state

`Lifecycle` tra loi asset dang o giai doan nao trong vong doi.
`Runtime state` tra loi asset co dang song, dang on dinh, dang suy giam hay khong.

### 7.4 Tat ca thay doi quan trong deu phai truy vet duoc

Can biet:

- ai tao asset
- ai gan node vao rack
- ai remap marker
- luc nao asset bi retire

### 7.5 Marker chi co gia tri khi map dung asset

Marker scan duoc nhung resolve sai asset thi van la marker hong theo nghia nghiep vu.

## 8. Lifecycle cua rack

### 8.1 Muc tieu nghiep vu

Lifecycle cua rack dam bao rack duoc dua vao he thong co trinh tu, co suc chua ro rang, co the chua node, va co the ngung su dung ma khong lam roi topology.

### 8.2 Cac trang thai chinh

- `CREATED`
- `READY`
- `ACTIVE`
- `DRAINING`
- `RETIRED`

Ngoai ra rack co `capacityState` rieng:

- `AVAILABLE`
- `EXPANDING`
- `FULL`

### 8.3 Y nghia tung trang thai

`CREATED`

- Rack da duoc tao record trong he thong.
- Thong tin co the chua day du hoac chua xac nhan.
- Chua nen cho node vao rack nay.

`READY`

- Rack da du thong tin co ban.
- Vi tri, suc chua va vai tro cua rack da duoc xac nhan.
- Rack san sang nhan node.

`ACTIVE`

- Rack dang duoc dung trong van hanh.
- Da co node hoac da san sang phuc vu topology chinh thuc.

`DRAINING`

- Rack dang trong qua trinh ngung nhan them node moi.
- Co the dang chuyen node sang rack khac de chuan bi retire.
- Khong nen dung trang thai nay qua lau ma khong co ke hoach xu ly tiep.

`RETIRED`

- Rack khong con tham gia van hanh.
- Khong nhan node moi.
- Du lieu lich su van duoc giu de truy vet.

### 8.4 Quy trinh nghiep vu cua rack

#### Flow R1: Tao rack

**Muc dich**

Tao mot rack moi de dua vao topology.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Co nhu cau tao rack moi.
- Ma rack chua bi trung.

**Cac buoc chinh**

1. Admin nhap thong tin rack.
2. He thong kiem tra ma rack co trung khong.
3. He thong tao rack o trang thai `CREATED`.
4. He thong ghi nhan ai tao va thoi diem tao.

**Ket qua**

- Rack moi ton tai trong he thong.
- Rack chua duoc dung de chua node.

#### Flow R2: Xac nhan rack san sang

**Muc dich**

Chuyen rack tu ban ghi khoi tao thanh rack san sang dua vao van hanh.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Rack dang o `CREATED`.
- Da co thong tin vi tri va suc chua toi thieu.

**Cac buoc chinh**

1. Admin kiem tra thong tin rack.
2. Admin xac nhan rack du dieu kien.
3. He thong chuyen rack sang `READY`.

**Alternative**

- Neu thong tin thieu hoac sai, rack giu nguyen `CREATED`.

**Ket qua**

- Rack co the nhan node.

#### Flow R3: Dua rack vao van hanh

**Muc dich**

Chuyen rack sang `ACTIVE` khi rack bat dau duoc su dung thuc te.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Rack dang `READY`.

**Cac buoc chinh**

1. Admin kich hoat rack.
2. He thong cho phep rack tham gia topology van hanh.
3. Rack bat dau duoc dung trong dashboard va cac flow lien quan.

**Ket qua**

- Rack o trang thai `ACTIVE`.

#### Flow R4: Cap nhat suc chua rack

**Muc dich**

Phan anh tinh trang suc chua cua rack trong qua trinh van hanh.

**Actor chinh**

`IT Administrator`

**Cac buoc chinh**

1. He thong theo doi so node dang nam trong rack.
2. Admin cap nhat capacity khi can.
3. He thong dua ra `capacityState` phu hop.

**Ket qua**

- Rack duoc biet la con cho, dang mo rong hay da day.

#### Flow R5: Dua rack vao draining

**Muc dich**

Ngung nhan node moi de chuan bi thay doi lon hoac retire rack.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Rack dang `ACTIVE`.

**Cac buoc chinh**

1. Admin danh dau rack la `DRAINING`.
2. He thong khong cho gan node moi vao rack.
3. Node hien co co the duoc chuyen ra theo ke hoach.

**Ket qua**

- Rack san sang cho flow retire.

#### Flow R6: Retire rack

**Muc dich**

Loai rack khoi van hanh nhung van giu lich su.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Rack da duoc draining.
- Khong con node hoac da co quyet dinh retire ro rang.

**Cac buoc chinh**

1. Admin yeu cau retire rack.
2. He thong kiem tra dieu kien.
3. He thong chuyen rack sang `RETIRED`.
4. He thong khoa cac thao tac them node moi vao rack.

**Ket qua**

- Rack ket thuc vong doi van hanh.

## 9. Lifecycle cua node

### 9.1 Muc tieu nghiep vu

Lifecycle cua node dam bao node duoc he thong phat hien, dat dung cho trong topology, dua vao van hanh, theo doi tinh hop le, va ngung su dung mot cach co kiem soat.

### 9.2 Cac trang thai chinh

`lifecycleState`:

- `DISCOVERED`
- `READY`
- `ACTIVE`
- `DRAINING`
- `RETIRED`

`assignmentState`:

- `UNASSIGNED`
- `ASSIGNED`
- `MOVED`

`runtime health` duoc theo doi rieng:

- `ONLINE`
- `STALE`
- `OFFLINE`
- `RECOVERING`

### 9.3 Y nghia tung trang thai

`DISCOVERED`

- Node duoc he thong phat hien tu collector hoac nguon mo phong.
- Node da ton tai trong record nhung chua chac da dung boi canh topology.

`READY`

- Node da du thong tin toi thieu.
- Co the da duoc xac minh metadata hoac da san sang de gan vao rack.

`ACTIVE`

- Node da duoc gan vao rack.
- Node duoc xem la asset van hanh chinh thuc.
- Node co the duoc dung trong dashboard, AR va workflow.

`DRAINING`

- Node sap duoc di chuyen, thay the hoac retire.
- Node khong nen tiep tuc duoc xem la asset on dinh trong ke hoach dai hon.

`RETIRED`

- Node khong con tham gia van hanh.

### 9.4 Quy trinh nghiep vu cua node

#### Flow N1: He thong phat hien node moi

**Muc dich**

Tu dong ghi nhan node moi ma khong can admin dang ky thu cong.

**Actor chinh**

`He thong`

**Preconditions**

- Collector hoac simulation producer co the gui thong tin nhan dien node.

**Cac buoc chinh**

1. He thong nhan duoc thong tin nhan dien node.
2. He thong kiem tra node da ton tai chua.
3. Neu chua ton tai, he thong tao record node moi.
4. Node duoc dat o trang thai `DISCOVERED`.
5. Neu chua biet rack, node nam o `UNASSIGNED`.

**Ket qua**

- Node moi duoc he thong biet den.

#### Flow N2: Chuan hoa thong tin node

**Muc dich**

Lam sach va hoan thien thong tin node de duoc dua vao topology dung nghia.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Node da `DISCOVERED`.

**Cac buoc chinh**

1. Admin xem thong tin node vua duoc phat hien.
2. Admin bo sung hoac sua metadata can thiet.
3. He thong chuyen node sang `READY` neu du dieu kien.

**Ket qua**

- Node san sang de duoc gan vao rack.

#### Flow N3: Gan node vao rack

**Muc dich**

Dat node vao vi tri topology cu the.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Node dang `READY` hoac `DISCOVERED`.
- Rack dich dang `READY` hoac `ACTIVE`.

**Cac buoc chinh**

1. Admin chon node.
2. Admin chon rack dich.
3. Admin khai bao vi tri rack position neu can.
4. He thong gan `rackId` cho node.
5. `assignmentState` chuyen sang `ASSIGNED`.

**Alternative**

- Neu rack da day, he thong canh bao va khong cho gan tiep neu co rule han che.

**Ket qua**

- Topology `rack -> node` duoc hinh thanh.

#### Flow N4: Kich hoat node trong van hanh

**Muc dich**

Chuyen node thanh asset van hanh chinh thuc.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Node da `ASSIGNED`.
- Co du metadata va da on dinh o muc toi thieu.

**Cac buoc chinh**

1. Admin xac nhan node da dung vi tri.
2. He thong chuyen `lifecycleState` sang `ACTIVE`.
3. Node duoc dung trong dashboard va AR context.

**Ket qua**

- Node tro thanh asset van hanh.

#### Flow N5: Di chuyen node sang rack khac

**Muc dich**

Cap nhat topology khi node doi vi tri.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Node dang `ACTIVE` hoac `DRAINING`.

**Cac buoc chinh**

1. Admin dua node vao trang thai chuan bi di chuyen neu can.
2. Admin chon rack moi.
3. He thong cap nhat `rackId`.
4. `assignmentState` chuyen sang `MOVED`.
5. He thong ghi lich su thay doi.

**Ket qua**

- Node co boi canh topology moi.

#### Flow N6: Dua node vao draining

**Muc dich**

Danh dau node sap bi thay doi lon, ngung su dung, hoac retire.

**Actor chinh**

`IT Administrator`

**Cac buoc chinh**

1. Admin danh dau node la `DRAINING`.
2. He thong hien canh bao rang node dang trong qua trinh chuyen doi.

**Ket qua**

- Node khong con duoc xem la tai san on dinh de tiep tuc bo sung context moi.

#### Flow N7: Retire node

**Muc dich**

Ket thuc vong doi cua node.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Node khong con nam trong ke hoach van hanh.

**Cac buoc chinh**

1. Admin ra lenh retire node.
2. He thong khoa node khoi luong gan marker moi neu co rule.
3. He thong chuyen node sang `RETIRED`.

**Ket qua**

- Node ngung vong doi van hanh nhung van giu lich su.

## 10. Lifecycle cua marker

### 10.1 Muc tieu nghiep vu

Lifecycle cua marker dam bao marker duoc tao dung, in dung, dan dung, quet dung, resolve dung asset, va duoc loai bo dung luc.

### 10.2 Cac trang thai chinh

- `DRAFT`
- `GENERATED`
- `PRINTED`
- `MOUNTED`
- `VALIDATED`
- `ACTIVE`
- `REMAPPED`
- `RETIRED`

### 10.3 Y nghia tung trang thai

`DRAFT`

- Marker dang trong qua trinh duoc khai bao.
- Chua co gia tri su dung.

`GENERATED`

- Marker da co `markerCode` va da duoc map logic toi asset dich.
- Chua duoc dua ra vat ly.

`PRINTED`

- Marker da duoc xuat va in.
- Co the chua duoc dan len asset.

`MOUNTED`

- Marker da duoc gan len vi tri vat ly.
- Chua chac da scan on dinh.

`VALIDATED`

- Marker da duoc scan thu thanh cong.
- Resolve dung asset va dung boi canh.

`ACTIVE`

- Marker da duoc chap nhan dua vao su dung chinh thuc.

`REMAPPED`

- Marker tung dai dien asset cu nhung da duoc chuyen sang asset moi.

`RETIRED`

- Marker khong con duoc dung trong van hanh.

### 10.4 Quy trinh nghiep vu cua marker

#### Flow M1: Tao marker cho asset

**Muc dich**

Khoi tao mot marker moi cho rack hoac node.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Asset dich ton tai.
- Asset dich duoc phep gan marker.

**Cac buoc chinh**

1. Admin chon asset dich.
2. Admin tao marker moi.
3. He thong tao `markerCode`.
4. He thong map marker toi asset.
5. Marker o trang thai `GENERATED`.

**Ket qua**

- Marker ton tai o muc logic.

#### Flow M2: In marker

**Muc dich**

Chuyen marker logic thanh doi tuong vat ly co the dan/scan.

**Actor chinh**

`IT Administrator`

**Cac buoc chinh**

1. Admin xuat marker.
2. Marker duoc in ra theo dinh dang image target.
3. He thong cap nhat marker sang `PRINTED`.

**Ket qua**

- Marker san sang de dan len asset.

#### Flow M3: Dan marker len asset

**Muc dich**

Gan marker vao vi tri vat ly phu hop.

**Actor chinh**

`IT Administrator` hoac nguoi duoc uy quyen

**Preconditions**

- Marker da `PRINTED`.

**Cac buoc chinh**

1. Marker duoc dan len rack hoac node.
2. Vi tri dan phai ro, it bi che, de nhin.
3. He thong cap nhat marker sang `MOUNTED`.

**Ket qua**

- Marker da ton tai tren hien truong.

#### Flow M4: Kiem tra marker co quet dung khong

**Muc dich**

Dam bao marker scan duoc va mo dung asset context.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Marker da `MOUNTED`.

**Cac buoc chinh**

1. Admin dung WebAR quet marker.
2. He thong resolve marker.
3. He thong doi chieu asset duoc resolve voi asset duoc mong doi.
4. Neu dung, marker chuyen sang `VALIDATED`.

**Alternative**

- Neu scan duoc nhung resolve sai asset, marker phai bi xem la loi nghiep vu.
- Neu scan khong on dinh, can doi vi tri dan, chat luong in, hoac map lai.

**Ket qua**

- Marker duoc xac nhan hop le hoac bi tra ve de sua.

#### Flow M5: Activate marker

**Muc dich**

Cho marker tham gia chinh thuc vao luong AR.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Marker da `VALIDATED`.

**Cac buoc chinh**

1. Admin kich hoat marker.
2. He thong bat `isActive`.
3. Marker tro thanh diem vao AR chinh thuc.

**Ket qua**

- Technician co the scan marker trong van hanh.

#### Flow M6: Remap marker

**Muc dich**

Chuyen marker sang dai dien cho asset khac khi co thay doi.

**Actor chinh**

`IT Administrator`

**Preconditions**

- Marker ton tai.
- Co ly do ro rang de remap.

**Cac buoc chinh**

1. Admin chon marker can remap.
2. Admin chon asset dich moi.
3. He thong cap nhat mapping.
4. Marker chuyen sang `REMAPPED`.
5. Marker phai duoc validate lai truoc khi active chinh thuc.

**Ket qua**

- Marker co mapping moi.

#### Flow M7: Retire marker

**Muc dich**

Ngung su dung marker cu.

**Actor chinh**

`IT Administrator`

**Cac buoc chinh**

1. Admin chon retire marker.
2. He thong tat `isActive`.
3. Marker chuyen sang `RETIRED`.

**Ket qua**

- Marker khong con duoc dung cho AR scan chinh thuc.

## 11. Flow end-to-end chinh: Rack -> Node -> Marker

### 11.1 Muc dich

Day la flow quan trong nhat de bien mot asset tu record logic thanh asset co the su dung trong dashboard va AR.

### 11.2 Trinh tu chi tiet

1. Admin tao rack.
2. Admin xac nhan rack san sang.
3. Rack duoc dua vao `READY`.
4. He thong phat hien node moi.
5. Node duoc tao o `DISCOVERED`.
6. Admin chuan hoa thong tin node.
7. Node duoc chuyen sang `READY`.
8. Admin gan node vao rack.
9. Node duoc chuyen sang `ASSIGNED`.
10. Admin kich hoat node.
11. Node duoc chuyen sang `ACTIVE`.
12. Admin tao marker cho rack hoac node.
13. Marker duoc `GENERATED`.
14. Marker duoc in.
15. Marker duoc dan len asset.
16. Marker duoc scan thu.
17. Neu resolve dung asset, marker duoc `VALIDATED`.
18. Admin kich hoat marker.
19. Marker duoc `ACTIVE`.
20. Technician scan marker de vao AR context.

### 11.3 Ket qua nghiep vu

Sau flow nay, he thong dat duoc:

- rack da ton tai trong topology
- node da nam dung cho trong rack
- marker da dai dien dung cho asset
- asset da co the duoc truy cap qua AR

## 12. Bo flow asset management day du

De tranh hieu nham rang asset management chi co flow tao moi, he thong can day du cac nhom flow sau.

### 12.1 Nhom flow onboarding

- tao rack
- xac nhan rack
- dua rack vao van hanh
- phat hien node
- chuan hoa node
- gan node vao rack
- kich hoat node
- tao marker
- in marker
- dan marker
- validate marker
- activate marker

### 12.2 Nhom flow thay doi trong van hanh

- cap nhat metadata rack
- cap nhat metadata node
- cap nhat vi tri node trong rack
- di chuyen node sang rack khac
- cap nhat boi canh marker
- remap marker
- tam vo hieu hoa marker
- cap nhat suc chua rack

### 12.3 Nhom flow kiem tra va xac minh

- kiem tra rack da du thong tin chua
- kiem tra node da duoc gan rack chua
- kiem tra node co dang o dung vi tri topology khong
- kiem tra marker co scan on dinh khong
- kiem tra marker co resolve dung asset khong
- kiem tra asset dang active co marker hop le khong

### 12.4 Nhom flow ngung su dung

- dua node vao draining
- retire node
- dua rack vao draining
- retire rack
- retire marker

### 12.5 Nhom flow truy vet va lam sach du lieu

- xem lich su tao/sua asset
- xem lich su di chuyen node
- xem lich su remap marker
- phat hien marker active nhung asset da retire
- phat hien node active nhung chua nam trong rack hop le
- phat hien rack da retired nhung van con node chua duoc xu ly

## 13. Business rules can co

### 13.1 Rule cho rack

- Khong duoc dua rack vao `READY` neu chua co ma rack va vi tri co ban.
- Khong duoc gan node vao rack da `RETIRED`.
- Khong nen gan node moi vao rack dang `DRAINING`.

### 13.2 Rule cho node

- Node khong can dang ky thu cong o phase hien tai.
- Node duoc phat hien tu dong, nhung khong co nghia la tu dong duoc tin dung ngay.
- Node chua gan rack thi khong duoc xem la asset van hanh hoan chinh.
- Node da `RETIRED` khong duoc gan marker moi.

### 13.3 Rule cho marker

- Mot marker chi dai dien cho mot asset tai mot thoi diem.
- Marker chua validate khong duoc active.
- Marker da remap phai validate lai.
- Marker active nhung resolve sai asset phai duoc xem la loi nghiep vu muc cao.

## 14. Dau ra mong doi khi trien khai asset management

Neu asset management duoc trien khai dung theo tai lieu nay, he thong se dat duoc:

- topology ro rang va it nham lan
- rack, node, marker co vong doi minh bach
- node duoc dua vao van hanh theo quy trinh co kiem soat
- marker tro thanh diem vao AR dang tin cay
- workflow monitoring va AR dung chung mot boi canh asset
- thay doi asset de truy vet, de audit, de bao cao

## 15. Ket luan

Asset management trong du an nay khong phai la mot danh sach CRUD.
No la mot chuoi quy trinh quan ly tai san day du tu luc asset xuat hien, duoc xac nhan, duoc dua vao van hanh, duoc thay doi, cho den luc ngung su dung.

Trong phase hien tai, can tap trung lam that ro va that chac 3 asset:

- `Rack`
- `Node`
- `Marker`

Khi 3 doi tuong nay da co vong doi va flow van hanh ro rang, cac phan sau nhu monitoring composition, AR diagnostics, incident va ticket workflow se de gan vao hon rat nhieu.
