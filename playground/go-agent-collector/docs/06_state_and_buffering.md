# Go Agent Collector State and Buffering

## 1. Muc tieu

Tai lieu nay chot cach `go-agent-collector` giu state va xu ly buffering.

Muc tieu:

- tach ro state nao o RAM, state nao persist
- chot retry va replay flow
- chot gioi han queue va buffer
- giu agent on dinh khi backend hoac network co van de

## 2. Nguyen tac

State va buffering nen giu 5 nguyen tac:

- nhe
- de recover
- khong lam agent qua phuc tap
- uu tien khong mat metric quan trong
- cho phep drop co chu dich khi qua nguong

## 3. Phan loai state

Agent nen co 4 loai state:

1. `ephemeral runtime state`
2. `calculation state`
3. `delivery state`
4. `persisted buffer state`

## 4. Ephemeral runtime state

State nay chi song trong RAM luc process dang chay.

Gom:

- scrape loop ticker state
- send loop ticker state
- in-memory queue
- current batch builder
- retry timers

Neu process restart, state nay duoc tao lai.

## 5. Calculation state

Day la state can de tinh metric tu counters hoac de giu context on dinh.

Gom:

- `last raw value`
- `last timestamp`
- `last boot time`
- `primary NIC cache`
- `system drive cache`

State nay can cho:

- rate/sec
- ratio
- reboot detect
- chon NIC on dinh

## 6. Delivery state

Day la state lien quan toi qua trinh gui batch:

- last successful send time
- current sequence number
- send failure count
- dropped record count

State nay co the giu trong RAM, nhung mot phan nen persist neu can continuity sau restart.

## 7. Persisted buffer state

Day la du lieu can luu ben vung khi khong gui duoc len backend.

No khong phai raw scrape state.
No la:

- full batch payload da san sang gui

Day la diem rat quan trong de giam logic replay.

## 8. In-memory queue

`In-memory queue` la noi agent dua metric records vao sau khi scrape + map.

Trach nhiem:

- demarcate giua scrape loop va send loop
- cho send loop gom batch

Queue nay nen:

- co gioi han kich thuoc
- thread-safe
- de doc va de debug

## 9. Gioi han queue

Cho PoC, nen co:

- `maxQueueRecords`
- hoac `maxQueueBytes`

Minh khuyen don gian truoc:

- `maxQueueRecords`

Vi de code va de quan sat hon.

Khi queue day, can co policy ro.

## 10. Queue overflow policy

Co 3 cach:

1. block scrape loop
2. drop newest
3. drop oldest

Cho agent telemetry, cach hop ly nhat thuong la:

- drop oldest

Ly do:

- du lieu moi thuong gia tri hon du lieu cu trong realtime monitoring

Can log ro:

- so record bi drop
- ly do drop

## 11. Counter calculation state

Nhung raw metrics dang la counter can state de tinh rate:

- network bytes
- packet totals
- packet errors
- tcp retransmits
- tcp connection failures
- disk bytes
- disk ops
- context switches
- system calls

Moi counter state nen giu:

- `metricName`
- `labelKey`
- `lastValue`
- `lastCollectedAt`

## 12. Boot state

Agent can giu:

- `lastBootTime`

Muc dich:

- detect reboot
- tinh `reboot_count_24h`
- tranh tinh sai uptime sau restart

Neu `windows_system_boot_time_timestamp` doi:

- ghi nhan event reboot
- tang counter reboot

## 13. Primary NIC state

Vi may co nhieu NIC, agent can co state de tranh primary NIC nhay qua lai lien tuc.

Nen giu:

- `selectedNicName`
- `selectedAt`
- `lastTrafficSeen`

Co the them TTL nhe:

- vi du `30s`

Neu trong TTL van hop le, uu tien giu NIC da chon.

## 14. System drive state

Tuong tu NIC, agent nen cache:

- `systemDrive`
- `detectedAt`

Vi khong can detect lai qua thuong xuyen neu config khong doi.

## 15. Batch buffer

Khi send fail, batch da tao xong nen duoc luu vao `buffer store`.

Buffer store nen luu:

- payload JSON hoan chinh
- metadata retry

Vi du:

- `batchId`
- `createdAt`
- `nextRetryAt`
- `attemptCount`
- `payloadPath` hoac payload body

## 16. Buffer storage type

Cho PoC, co 2 lua chon hop ly:

1. file JSON theo batch
2. SQLite nhe

MVP minh khuyen:

- file JSON theo batch

Ly do:

- de code nhanh
- de inspect bang tay
- chua can query phuc tap

## 17. Buffer folder structure

Co the de:

```text
data/
  buffer/
    pending/
    failed/
    replaying/
```

Ban dau co the don gian hon nua:

```text
data/
  buffer/
```

Moi batch la mot file JSON.

## 18. Retry policy

Retry nen ap dung cho:

- network timeout
- backend 5xx
- connection refused

Khong nen retry vo han cho:

- payload invalid
- backend 4xx do schema sai

Backoff goi y:

- min `1s`
- max `30s`
- exponential backoff

## 19. Replay flow

Khi backend hoi phuc, agent nen:

1. uu tien replay buffered batches cu
2. sau do moi gui metrics moi

Hoac:

1. gui xen ke cu va moi theo ratio

Cho MVP, cach don gian va an toan hon la:

- replay cu truoc

Trang thai implement hien tai:

- retryable send fail se dua full payload vao disk buffer
- send loop uu tien replay buffer truoc khi gui queue moi
- non-retryable buffered payload co the bi drop de tranh block replay vo han
- counter calculation state van nam trong RAM

Can co gioi han de replay khong block vo han metrics moi.

## 20. Buffer size limit

Can co gioi han ro:

- `bufferMaxSizeMb`
- `bufferMaxBatchFiles`

Cho PoC hien tai:

- `bufferMaxSizeMb = 50`

la hop ly.

## 21. Buffer overflow policy

Khi buffer day, can chot policy.

Minh khuyen:

- drop oldest buffered batch

va ghi log:

- batch nao bi drop
- tai sao drop
- so luong drop

Neu muon uu tien metric moi hon, day la chinh sach hop ly cho monitoring realtime.

## 22. State persistence toi thieu

Nhung state nen persist qua restart:

- reboot tracking can thiet
- batch sequence neu muon continuity
- buffered payloads

Nhung state co the khong can persist trong MVP:

- current in-memory queue
- temporary current batch
- last short-term NIC selection

## 23. Co nen persist counter state khong

Cho MVP, khong bat buoc.

Neu process restart:

- cycle dau sau restart khong tinh duoc rate chinh xac
- tu cycle thu hai tro di se on lai

Day la tradeoff hop ly de giu agent gon.

## 24. Error handling lien quan state

### 24.1. State write fail

Neu khong ghi duoc state nhe:

- log warn
- tiep tuc runtime

### 24.2. Buffer write fail

Neu khong ghi duoc batch vao buffer:

- log error
- tang drop counter
- bo batch neu het cach

Day la truong hop xau nhat, nen can internal metrics de nhin thay.

## 25. Internal metrics cho state va buffer

Nen co:

- `queue_length`
- `queue_drop_count`
- `buffered_batch_count`
- `buffered_bytes`
- `buffer_write_fail_count`
- `replay_success_count`
- `replay_fail_count`
- `last_successful_send_at`

## 26. Shutdown handling

Khi shutdown:

1. stop scrape loop
2. stop nhan metric moi vao queue neu can
3. flush current batch neu trong timeout
4. persist state toi thieu
5. dong file handles

Neu timeout het:

- log ro flush incomplete

## 27. Go structs de xuat

Khi code Go, co the nghi theo nhom struct:

- `CounterState`
- `BootState`
- `NicState`
- `DeliveryState`
- `BufferedBatchMeta`

Khong can lam qua nhieu interface o giai doan dau.

## 28. MVP implementation de xuat

Cho MVP, state & buffering nen chot nhu sau:

- queue trong RAM co gioi han theo `record count`
- counter state trong RAM
- boot state trong RAM
- primary NIC cache trong RAM
- batch payload buffer bang file JSON tren disk
- retry exponential backoff
- replay buffer truoc khi gui metrics moi

Day la muc vua du de:

- code nhanh
- debug duoc
- khong mat qua nhieu metric khi backend loi

## 29. Ket luan

State va buffering cho agent nay nen theo huong:

- tinh toan state thi nhe
- giao van payload thi ben vung
- retry co gioi han
- drop policy ro rang

Tai lieu nay la nen de viet:

- `state/*`
- `queue/*`
- `buffer/*`
- `retry/*`
- `sender/*`
