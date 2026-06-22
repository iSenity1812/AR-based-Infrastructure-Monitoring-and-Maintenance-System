# Ticket Flow Service - Agent Handoff

Tai lieu nay ban giao context de tiep tuc implementation trong mot chat moi.

## 1. Vi tri code va quy tac quan trong

- Source code da lam nam tai `backend/apps/control-plane/incident-workflow-service/`.
- Doc truoc khi sua:
  - `docs/project-coding-skill.md`
  - `docs/superpowers/specs/2026-06-18-incident-workflow-ticket-design.md`
  - `AGENTS.md`, `ENGINEER.md`, `CONTRACTS.md` neu thay doi architecture hoac API contract.
- Chi tap trung vao  `incident-workflow-service`; khong sua `asset-service` và `identity-service` neu task khong yeu cau.
- Giu clean architecture: `domain -> use-cases -> ports <- adapters`; controller chi map HTTP va goi use case.

## 2. Muc tieu nghiep vu

`Incident Workflow Service` la bounded context quan ly:

- ticket lifecycle;
- assignment va acknowledge;
- comment/activity timeline;
- incident lifecycle co ban;
- lien ket hai chieu giua incident va ticket.

Service khong owner alert, asset topology, telemetry history, notification delivery hoac audit storage.

## 3. Tinh nang da hoan thanh

### Nen tang service

- NestJS 11 + TypeScript 5.9.
- MongoDB/Mongoose, database mac dinh `incident_workflow_db`.
- Config tu `.env`/`.env.example`.
- Global prefix mac dinh `api/v1`.
- Global `ValidationPipe`: `whitelist`, `transform`, `forbidNonWhitelisted`.
- Request/correlation ID middleware.
- Response envelope `{ data, meta }` va error envelope `{ error, meta }`.
- Swagger tai `/api/v1/docs`, co Bearer authentication va `persistAuthorization`.
- JWT Passport strategy dung chung `JWT_ACCESS_SECRET` voi identity-service.
- Permission guard dua tren danh sach `permissions` trong JWT.

### Ticket Core

- Tao ticket standalone hoac gan vao incident.
- Chong trung `ticketCode`.
- List ticket, tim theo ID.
- Filter repository theo `ticketCode`, `incidentId`, `status`, `priority`.
- Lifecycle policy:
  - `OPEN -> ASSIGNED | CANCELLED`
  - `ASSIGNED -> IN_PROGRESS | WAITING_FOR_INFO | RESOLVED | CANCELLED`
  - `IN_PROGRESS -> WAITING_FOR_INFO | RESOLVED | CANCELLED`
  - `WAITING_FOR_INFO -> ASSIGNED | IN_PROGRESS | RESOLVED | CANCELLED`
  - `RESOLVED -> CLOSED`
  - `CLOSED` va `CANCELLED` la terminal states.
- Moi lan tao/doi status co activity timeline.

### Assignment va Ownership

- Assign/reassign ticket.
- Khong assign ticket da `CLOSED` hoac `CANCELLED`.
- Khong assign lai cung mot assignee.
- Luu `ownerUserId`, `assigneeUserId`, `assignedAt` va activity.
- Technician duoc acknowledge khi chinh `userId` trong JWT trung `assigneeUserId`.
- Acknowledge idempotent neu ticket da duoc acknowledge.

### Comment va Activity Timeline

- Them comment vao ticket.
- Reject comment rong.
- Activity types hien co: `CREATED`, `ASSIGNED`, `REASSIGNED`, `ACKNOWLEDGED`, `COMMENT_ADDED`, `STATUS_CHANGED`.

### Incident Core

- Tao/list/get incident.
- Chong trung `incidentCode`.
- Validate tat ca `ticketIds` ton tai truoc khi tao incident.
- Khi tao incident voi ticket, cap nhat `incidentId` tren ticket.
- Khi tao ticket voi incident, them ticket ID vao `incident.ticketIds`.
- Status incident da khai bao: `OPEN`, `TRIAGED`, `INVESTIGATING`, `MITIGATING`, `RESOLVED`, `CLOSED`, `CANCELLED`.

## 4. API hien co

Base URL local: `http://localhost:4003/api/v1`.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/tickets` | `tickets.create` |
| GET | `/tickets` | `tickets.read` |
| GET | `/tickets/:id` | `tickets.read` |
| PATCH | `/tickets/:id/status` | `tickets.status.update` |
| PATCH | `/tickets/:id/assignment` | `tickets.assign` |
| POST | `/tickets/:id/acknowledge` | `tickets.acknowledge` |
| POST | `/tickets/:id/comments` | `tickets.comment` |
| POST | `/incidents` | `incidents.create` |
| GET | `/incidents` | `incidents.read` |
| GET | `/incidents/:id` | `incidents.read` |

## 5. Authentication va user ID

- Login tai `identity-service`, lay `accessToken`, sau do nhap token vao nut **Authorize** cua Swagger incident workflow.
- Hai service phai co cung gia tri `JWT_ACCESS_SECRET`.
- JWT payload identity hien co cac field:
  - `userId`
  - `username`
  - `sessionId`
  - `roles`
  - `permissions`
  - `mustChangePassword` (optional)
- `tech-1` tung dung trong kich ban test chi la placeholder. Khi test that, `assigneeUserId` phai la `userId` that cua technician lay tu login response/JWT.
- Operator/admin thuong dung token co `tickets.create`, `tickets.read`, `tickets.assign`, `tickets.status.update`, `tickets.comment`.
- Technician dung token co `tickets.read`, `tickets.acknowledge`, `tickets.comment`, `tickets.work.start`, `tickets.resolve`, `tickets.evidence.attach`.
- Identity permission constants va system role policy da duoc mo rong cho ticket flow; cac thay doi nay hien chua commit.

## 6. Cau truc source code

```text
incident-workflow-service/
|- src/
|  |- domain/
|  |  |- constants/       # status, priority, severity, permission, activity
|  |  |- entities/        # TicketEntity, IncidentEntity
|  |  |- policies/        # ticket lifecycle state machine
|  |  `- ports/           # repository interfaces va DI tokens
|  |- use-cases/
|  |  |- commands/        # ticket.commands.ts, incident.commands.ts
|  |  |- queries/         # health query
|  |  |- dto/             # auth context va health output
|  |  `- errors/          # typed use-case errors
|  |- adapters/
|  |  `- persistence/mongoose/
|  |     |- schemas/      # ticket va incident schemas
|  |     `- repositories/ # Mongoose port implementations
|  |- presentation/http/
|  |  |- controllers/     # health, tickets, incidents
|  |  |- dto/             # request validation va Swagger schemas
|  |  |- guards/          # JWT va permission guards
|  |  |- strategies/      # Passport JWT strategy
|  |  |- decorators/      # auth context va required permissions
|  |  |- interceptors/    # API success envelope
|  |  |- filters/         # exception to API error envelope
|  |  `- serializers/     # envelope serializers
|  `- infrastructure/
|     |- config/          # typed config access
|     `- di/              # Nest module va use-case tokens
|- tests/unit/            # domain/use-case/guard unit tests
|- .env.example
|- package.json
`- README.md
```

## 7. Test va trang thai xac minh

Da xac minh ngay `2026-06-20`:

- `cmd /c pnpm test`: 9/9 suites pass, 20/20 tests pass.
- `cmd /c pnpm build`: pass.
- Test hien co cho health, lifecycle policy, create ticket, transition status, assign, acknowledge, comment, create incident va permission guard.
- Chua co integration test voi MongoDB va chua co HTTP e2e test bang Supertest.

Lenh local tren Windows:

```powershell
cd backend\apps
docker compose up -d mongo

cd control-plane\incident-workflow-service
cmd /c pnpm install
cmd /c pnpm dev
```

Swagger: `http://localhost:4003/api/v1/docs`.

## 8. Viec chua lam

### Uu tien gan nhat: Evidence va Attachments (Phase 1D)

Can them:

- domain entity/value object cho evidence/attachment;
- repository port records va Mongoose subdocument/schema;
- use case attach/list evidence;
- DTO validation va controller endpoint;
- permission `tickets.evidence.attach`;
- activity type `EVIDENCE_ATTACHED`;
- unit tests va HTTP integration tests.

Khong luu binary image truc tiep trong MongoDB. Nen luu metadata va object-storage reference; object storage provider hien **Chua xac dinh duoc**.

### Phase tiep theo

- Incident status transition va lifecycle policy.
- Start work/resolve/close/cancel thanh use case rieng theo permission hien co.
- Event publisher ports cho notification/audit hooks.
- Inspection workflow va WebAR evidence submission.
- Monitoring handoff/auto-create incident-ticket.
- Pagination va read models cho dashboard.
- Docker Compose/service registry/CI-CD cho incident workflow service.
- API contract doc va README day du.

## 9. Known issues va technical debt

- `UseCaseHttpExceptionFilter` chua map truc tiep `BadRequestUseCaseError`; hien co nguy co tra `500` thay vi `400` cho invalid transition/comment rong. Day la fix nen lam truoc.
- `PATCH /tickets/:id/status` chua truyen auth actor vao use case; activity actor dang suy ra tu assignee/owner/system.
- `POST /tickets` cho phep client gui `ownerUserId`; can quyet dinh owner lay tu JWT hay admin-provided field.
- Repository ho tro filter `priority`, nhung tickets controller chua expose query `priority`.
- Incident repository ho tro `severity` va `ticketId`, nhung incidents controller chua expose hai query nay.
- List endpoint chua pagination.
- Link incident-ticket cap nhat hai collection khong co Mongo transaction; co the bi partial update.
- JWT chi verify signature/expiry; chua kiem tra session revoke truc tiep voi identity-service.
- `README.md` hien thieu endpoint assignment, acknowledge, comment va auth instructions.
- Service chua co migration/seed rieng, Compose service, k3s manifest, CI/CD registry entry.
- Chua co Swagger response schemas/status codes chi tiet.

## 10. Thu tu de chat moi tiep tuc

1. Doc file handoff nay va hai docs source-of-truth o muc 1.
2. Chay `git status --short`; khong revert thay doi chua commit cua user.
3. Chay lai `cmd /c pnpm test` va `cmd /c pnpm build` trong `incident-workflow-service`.
4. Fix `BadRequestUseCaseError` mapping va them test cho exception filter.
5. Them HTTP e2e test cho create -> assign -> acknowledge -> comment -> status transition.
6. Implement Evidence/Attachments theo Phase 1D, giu dung layer va port boundary.
7. Cap nhat README/API contract sau khi public API thay doi.

## 11. Definition of Done cho moi feature

- Domain rule khong nam trong controller hoac Mongoose repository.
- DTO co `class-validator` va Swagger decorators.
- Endpoint co JWT + permission dung actor.
- Use case phu thuoc port, khong phu thuoc concrete adapter.
- Success/error response theo envelope hien co.
- Co unit test cho happy path va business rejection.
- Co integration/e2e test neu thay doi persistence hoac HTTP contract.
- `pnpm test`, `pnpm build`, va lint lien quan deu pass.
- Docs/README/contract duoc cap nhat neu API public thay doi.

## 12. Cap nhat trien khai 2026-06-21

- Da map tat ca `BaseUseCaseError`, bao gom `BadRequestUseCaseError`, sang HTTP envelope dung status thay vi roi xuong 500.
- Da them unit test cho exception filter.
- Da them HTTP e2e in-memory cho flow create -> assign -> acknowledge -> comment -> attach evidence -> status transition.
- Da hoan thanh Evidence/Attachments Phase 1D o muc metadata/reference:
  - evidence types: `IMAGE`, `NOTE`, `DOCUMENT`, `LINK`, `DIAGNOSTIC_SNAPSHOT`, `FIELD_EVIDENCE`;
  - Mongoose subdocument va repository mapping;
  - `POST /tickets/:id/evidence` voi permission `tickets.evidence.attach`;
  - `GET /tickets/:id/evidence` voi permission `tickets.read`;
  - activity `EVIDENCE_ATTACHED`;
  - reject payload khong co `storageKey`, `url`, hoac `note` va reject ticket terminal.
- Khong luu binary trong MongoDB. Object-storage upload/provider van chua duoc chon.
- Xac minh: 12 suites, 25 tests pass; build pass.
- Da sua ESLint flat config de dung truc tiep parser/plugin dang co trong `package.json`.
- Uu tien tiep theo: repository integration test voi MongoDB, incident lifecycle policy/status transition, va tach start/resolve/close/cancel use cases theo permission.

## 13. Cap nhat Cloudflare R2 2026-06-21

- Da them object-storage port va adapter `CloudflareR2ObjectStorageAdapter` dung S3-compatible presigned `PUT` upload flow.
- Da them endpoint moi:
  - `POST /tickets/:id/evidence/upload-url` voi permission `tickets.evidence.attach`.
- Endpoint moi se:
  - validate ticket ton tai va khong o terminal state;
  - reject evidence types khong phu hop upload binary (`NOTE`, `LINK`);
  - tao `storageKey` theo prefix `tickets/<ticketId>/<type>/<uuid>-<fileName>`;
  - tra ve `uploadUrl`, `method`, `headers`, `expiresAt`, `storageKey`, va `objectUrl` neu co `R2_PUBLIC_BASE_URL`.
- Da them env config:
  - `R2_ENDPOINT` (preferred)
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_BASE_URL` (optional)
  - `R2_EVIDENCE_PREFIX`
  - `R2_PRESIGN_EXPIRES_SECONDS`
- Service hien ho tro ca alias env de giam cong doi config:
  - `ACCESS_KEY_ID`
  - `SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_URL`
- Luong client duoc khuyen nghi:
  1. Goi `POST /tickets/:id/evidence/upload-url`
  2. Upload file truc tiep len R2 bang `PUT`
  3. Goi `POST /tickets/:id/evidence` de ghi metadata/reference vao ticket
- Xac minh:
  - `pnpm lint`: pass
  - `pnpm test`: 13 suites, 28 tests pass
  - `pnpm build`: pass

## 14. Trang thai con lai sau cap nhat 2026-06-22

- Muc Evidence/Attachments Phase 1D trong muc 8 da duoc hoan thanh o cac muc 12 va 13; khong con la backlog uu tien nua.
- Provider object storage da duoc chot la Cloudflare R2, kem presigned upload flow.

### Backlog con lai uu tien cao

- Repository integration test voi MongoDB that.
- Incident lifecycle policy va endpoint/use case transition status cho incident.
- Tach cac hanh dong ticket theo permission thanh use case rieng:
  - start work
  - resolve
  - close
  - cancel
- Chot actor cho `PATCH /tickets/:id/status` thay vi suy ra tu owner/assignee/system.

### Backlog muc tiep theo

- Event publisher ports cho notification/audit hooks.
- Inspection workflow va WebAR evidence submission.
- Monitoring handoff/auto-create incident-ticket.
- Pagination va read models cho dashboard/list APIs.
- Docker Compose/service registry/CI-CD cho incident workflow service.
- Swagger response schemas/status codes chi tiet.
- API contract/doc README bo sung day du cho flow moi.

### Technical debt/chua chot quyet dinh

- `POST /tickets` hien van cho client gui `ownerUserId`; can chot owner lay tu JWT hay tu payload admin.
- Tickets controller chua expose query `priority`.
- Incidents controller chua expose query `severity` va `ticketId`.
- Link incident-ticket hien chua co Mongo transaction, van co nguy co partial update.
- JWT moi verify signature/expiry; chua check session revoke truc tiep voi identity-service.
- Chua co migration/seed rieng cho service.
