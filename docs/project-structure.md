# Project Coding Skill / Coding Rules

Tài liệu này giúp AI agent hoặc developer mới hiểu nhanh repository hiện tại và cách tiếp tục phát triển mà không phá vỡ kiến trúc đã có.

Nguồn phân tích: code và tài liệu hiện có trong repository, gồm `README.md`, `AGENTS.md`, `ENGINEER.md`, `CONTRACTS.md`, `FRONTEND.md`, `OPS.md`, `docs/*`, `frontend/*`, `backend/apps/*`, `infra/*`, `.github/*`, và các prototype trong `playground/*`.

## 1. Tổng Quan Dự Án

### Dự án dùng để làm gì?

Đây là nền tảng proof-of-concept cho **AR-based Infrastructure Monitoring and Maintenance System**:

- Giám sát hạ tầng tập trung.
- Thu thập telemetry từ node/agent.
- Quản lý topology rack/node và QR/WebAR marker.
- Hỗ trợ maintenance workflow bằng WebAR.
- Hướng tới alert, incident, ticket, notification, audit và AI anomaly/risk enrichment.
- Mô phỏng vận hành data center trong môi trường PoC.

Các tài liệu gốc xác định hệ thống theo 2 phần lớn:

- **Control plane**: API, identity, asset context, monitoring, incident workflow, simulation, notification, audit.
- **Data plane**: telemetry ingestion, stream processing, AI analytics.

### Module/chức năng chính hiện có trong code

| Khu vực                               | Hiện trạng                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                              | Next.js scaffold tại `frontend/`, mới có App Router mặc định, global CSS, `Button` primitive. Chưa có dashboard/WebAR flow thực tế.                                         |
| Identity Service                      | NestJS service tại `backend/apps/control-plane/identity-service`, quản lý auth, session, user, role, permission.                                                            |
| Asset Service / Asset Context Service | NestJS service tại `backend/apps/control-plane/asset-service`, quản lý rack, node, marker, marker resolution và topology query.                                             |
| Ingestion Worker                      | Go service tại `backend/apps/ingestion-worker`, nhận gRPC registration và telemetry ingest, lưu node registration vào Redis, publish telemetry envelope lên Redpanda/Kafka. |
| Shared backend types                  | Một số shared error/response type tại `backend/apps/shared`.                                                                                                                |
| Infra                                 | Dockerfile, Docker Compose shared runtime, k3s manifests cho identity/asset, GitHub Actions CI/CD cho identity/asset.                                                       |
| Playground                            | Go agent collector, telemetry debug backend, Redpanda producer/consumer prototype. Có giá trị tham khảo nhưng không phải production service chính.                          |

### Tech stack hiện tại

| Layer                              | Stack trong code hiện tại                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                           | Next.js `16.2.7`, React `19.2.4`, TypeScript, Tailwind CSS 4, shadcn/radix-nova, Radix UI, lucide-react, TanStack Query/Table/Virtual, Zustand, Zod, ky.                                    |
| Control-plane backend              | NestJS, TypeScript, Mongoose/MongoDB, class-validator, class-transformer, Swagger, Passport/JWT.                                                                                            |
| Identity service                   | NestJS 10, Mongoose 8, Jest 29, migrate-mongo.                                                                                                                                              |
| Asset service                      | NestJS 11, Mongoose 9, Redis cache adapter, Problem Details, Jest 30, migrate-mongo.                                                                                                        |
| Data-plane implementation hiện tại | Go `1.25.5` ingestion worker, gRPC/protobuf, Redis, franz-go Redpanda/Kafka producer.                                                                                                       |
| Target data-plane trong docs       | Python services được nhắc trong docs target, nhưng code thật hiện tại đang có Go ingestion worker. Không tự giả định Python nếu sửa code hiện tại.                                          |
| Database/runtime                   | MongoDB, Redis, Redpanda/Kafka trong `backend/apps/docker-compose.yml`. Docs target còn nhắc TimescaleDB, Object Storage, Vertex AI nhưng chưa thấy implementation đầy đủ trong code chính. |
| Deployment                         | Docker, k3s manifests cho identity/asset, GitHub Actions CI/CD theo service.                                                                                                                |

## 2. Cấu Trúc Thư Mục

### Top-level

| Path                                           | Ý nghĩa                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `README.md`                                    | Tổng quan chiến lược, kiến trúc target, reading order.                              |
| `AGENTS.md`                                    | Quy tắc cho contributor/AI agent, guardrails về architecture.                       |
| `ENGINEER.md`                                  | Implementation standards, clean architecture, testing, CI/CD.                       |
| `CONTRACTS.md`                                 | Chuẩn REST/gRPC/Kafka contracts, response envelope, error envelope, correlation ID. |
| `FRONTEND.md`                                  | Quy tắc frontend, WebAR, state/data access, component structure.                    |
| `OPS.md`                                       | Runtime/deployment/observability baseline.                                          |
| `docs/`                                        | Source of truth về requirement, architecture, data pipeline, contracts.             |
| `frontend/`                                    | Frontend Next.js hiện tại. Đây là frontend thật trong repo hiện tại.                |
| `backend/apps/`                                | Backend services thật hiện tại.                                                     |
| `backend/apps/control-plane/identity-service/` | Identity/auth service.                                                              |
| `backend/apps/control-plane/asset-service/`    | Asset context/topology/marker service.                                              |
| `backend/apps/ingestion-worker/`               | Go ingestion worker.                                                                |
| `backend/apps/shared/`                         | Shared response/error TypeScript output dùng bởi asset-service.                     |
| `infra/`                                       | CI helper và k3s manifests.                                                         |
| `.github/`                                     | Service registry, issue templates, CI/CD workflows.                                 |
| `playground/`                                  | Prototype, debug, collector experiments.                                            |
| `packages/`                                    | Hiện chỉ có README; chưa có shared packages thật.                                   |
| `apps/`                                        | Hiện là placeholder/rỗng. Không tìm frontend/backend thật tại đây.                  |

### Frontend

| Path                                    | Ý nghĩa                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `frontend/package.json`                 | Scripts `dev`, `build`, `start`, `lint`; dependencies frontend.                                                    |
| `frontend/next.config.ts`               | Next config hiện gần như mặc định.                                                                                 |
| `frontend/tsconfig.json`                | Strict TypeScript, alias `@/* -> ./src/*`, `allowJs: true`, `jsx: react-jsx`.                                      |
| `frontend/eslint.config.mjs`            | ESLint Next core-web-vitals + TypeScript.                                                                          |
| `frontend/components.json`              | shadcn config: style `radix-nova`, RSC enabled, icon library `lucide`, aliases `@/components`, `@/lib`, `@/hooks`. |
| `frontend/src/app/page.tsx`             | Trang mặc định từ create-next-app. Chưa phải dashboard thật.                                                       |
| `frontend/src/app/layout.tsx`           | Root layout, Geist fonts, metadata mặc định.                                                                       |
| `frontend/src/app/globals.css`          | Tailwind 4, shadcn tokens, theme CSS variables.                                                                    |
| `frontend/src/components/ui/button.tsx` | Button primitive dùng `class-variance-authority`, Radix `Slot`, `cn`.                                              |
| `frontend/src/lib/utils.ts`             | `cn(...inputs)` dùng `clsx` + `tailwind-merge`.                                                                    |

### Backend control plane

Mẫu layer hiện tại:

```text
src/
|- domain/
|- use-cases/
|- adapters/
|- infrastructure/
\- presentation/
```

Ý nghĩa:

- `domain/`: entity, enum, policy, port interface. Không chứa NestJS controller/HTTP/persistence code.
- `use-cases/`: command/query/service orchestration, use-case errors, DTO mapping.
- `adapters/`: Mongoose repositories, security adapters, cache adapters, messaging adapters.
- `infrastructure/`: bootstrap, config, DI module.
- `presentation/`: HTTP controllers, DTO, guards, decorators, filters, serializers, strategies.

### Config quan trọng

| File                                                       | Ghi chú                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `package.json` root                                        | Chỉ có `prepare: husky`, commitlint/husky. Root chưa phải pnpm workspace orchestration hoàn chỉnh. |
| `commitlint.config.cjs`                                    | Dùng Conventional Commits qua `@commitlint/config-conventional`.                                   |
| `frontend/pnpm-workspace.yaml`                             | Workspace file hiện nằm trong frontend, không nằm ở root.                                          |
| `backend/apps/docker-compose.yml`                          | Local Redis, MongoDB, Redpanda, Redpanda Console, Vector, ingestion-worker, nginx.                 |
| `backend/apps/control-plane/identity-service/.env.example` | `PORT`, `MONGODB_URI`, JWT secrets/TTL, seed admin/operator/technician, `API_PREFIX`.              |
| `backend/apps/control-plane/asset-service/.env.example`    | `PORT`, `ASSET_MONGODB_URI`, JWT secret, Swagger flag, Mongo retry/timeout.                        |
| `backend/apps/control-plane/*/migrate-mongo-config.js`     | Mongo migration config.                                                                            |
| `backend/apps/control-plane/*/Dockerfile`                  | Multi-stage Node 22 Alpine builds.                                                                 |
| `backend/apps/ingestion-worker/Dockerfile`                 | Go build image + Debian runtime image.                                                             |
| `infra/k3s/*`                                              | Namespace, configmap, deployment, service cho identity/asset.                                      |
| `.github/service-registry.json`                            | Registry CI/CD hiện chỉ khai báo `identity-service` và `asset-service`.                            |

## 3. Quy Tắc Code Hiện Tại

### Quy tắc kiến trúc chung

- Ưu tiên docs source-of-truth: `docs/*`, sau đó `AGENTS.md`, `ENGINEER.md`, `CONTRACTS.md`, `FRONTEND.md`, `OPS.md`.
- Thiết kế theo bounded context, không theo screen/controller/table.
- Giữ tách biệt control plane và data plane.
- Áp dụng database-per-service: service không query trực tiếp DB authoritative của service khác.
- `Control Plane API and BFF` là composition layer, không sở hữu business truth.
- `Kafka/Redpanda` là event backbone, không phải workflow database.
- `Redis` chỉ là cache/derived/short-lived state, không là source of truth dài hạn.
- `WebAR Client` không đọc raw telemetry trực tiếp.

### Naming

| Loại               | Quy tắc đang dùng                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Service/folder     | kebab-case: `identity-service`, `asset-service`, `ingestion-worker`.                                    |
| Controller         | `<domain>.controller.ts`, ví dụ `auth.controller.ts`, `admin-users.controller.ts`.                      |
| DTO                | `<action>-<resource>-request.dto.ts`, ví dụ `create-user-request.dto.ts`, `marker.request.dto.ts`.      |
| Use case           | `<action>.use-case.ts` hoặc grouped commands/queries, ví dụ `login.use-case.ts`, `topology.queries.ts`. |
| Repository adapter | `mongoose-<entity>.repository.ts`.                                                                      |
| Port               | `<capability>.port.ts`, token ở `port.tokens.ts`.                                                       |
| Entity             | `<domain>.entity.ts` hoặc grouped entity file như `asset-context.entities.ts`.                          |
| Go package         | Lowercase package folders: `domain`, `usecase`, `adapter`, `delivery`, `port`.                          |

### Import/export

- Frontend dùng alias `@/*` tới `frontend/src/*`.
- Asset-service dùng path aliases: `@domain/*`, `@use-cases/*`, `@adapters/*`, `@presentation/*`, `@infrastructure/*`, `@shared/*`.
- Identity-service cũng có aliases trong `tsconfig.json`, nhưng một số file vẫn dùng relative imports.
- Adapter/persistence không được leak Mongoose document ra controller/public response; mapping nằm ở adapter/mapper.
- Shared code chỉ nên chứa contracts, base response/error, config/logging/utils; không chứa business logic của một service.

### Layering backend

Controllers:

- Mỏng, chỉ nhận DTO/param/query/context và gọi use case.
- Dùng Swagger decorators như `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`.
- Không truy cập Mongoose model trực tiếp.

Use cases:

- Chứa orchestration business flow.
- Phụ thuộc vào port/repository interface hoặc injected service, không phụ thuộc controller.
- Throw use-case errors như `NotFoundUseCaseError`, `ConflictUseCaseError`, `ForbiddenUseCaseError`.

Domain:

- Chứa entity/enum/policy/port.
- Không import NestJS, HTTP, Mongoose.
- Identity domain có class entity như `IdentityUser`, `IdentityRole`, `IdentitySession`.
- Asset domain dùng interface/entity result và lifecycle enum cho rack/node/marker.

Adapters:

- Implement port.
- Mongoose repositories nằm dưới `adapters/persistence/mongoose`.
- Security adapters của identity: bcrypt password hasher, JWT issuer, UUID refresh token generator.
- Asset cache adapter: `CacheManagerAssetQueryCacheAdapter`.

Infrastructure:

- Bootstrap Nest app.
- Wire DI module.
- Load config/env.
- Set global prefix, pipes, filters, interceptors, Swagger.

### Validate dữ liệu

Control-plane NestJS:

- Dùng `ValidationPipe` global với:
  - `whitelist: true`
  - `transform: true`
  - `forbidNonWhitelisted: true`
- DTO dùng `class-validator`: `@IsString`, `@IsEmail`, `@IsEnum`, `@IsOptional`, `@IsArray`, `@IsObject`, `@Min`, `@IsInt`, `@IsBoolean`.
- DTO cũng dùng Swagger decorators `@ApiProperty` / `@ApiPropertyOptional`.

Asset-service:

- Custom `exceptionFactory: createValidationProblem`.
- Validation errors được normalize thành Problem Details-like error envelope.

Identity-service:

- ValidationPipe global không có custom exception factory.
- Error filter normalize Nest validation exception vào error envelope.

Go ingestion-worker:

- gRPC handler map protobuf request sang domain request.
- Telemetry handler kiểm tra nil request và lỗi value conversion.
- Chưa thấy validation schema sâu tương đương Pydantic/class-validator trong code Go hiện tại.

### Xử lý lỗi

Identity-service:

- `UseCaseHttpExceptionFilter` bắt mọi exception.
- Map use-case errors sang status/error code:
  - `UnauthorizedUseCaseError` -> `UNAUTHENTICATED`
  - `ForbiddenUseCaseError` -> `PERMISSION_DENIED`
  - `ConflictUseCaseError` -> `CONFLICT`
  - `NotFoundUseCaseError` -> `NOT_FOUND`
- Error response dùng `serializeErrorEnvelope`.

Asset-service:

- `ProblemDetailsExceptionFilter` dùng `toProblemDetails`.
- Shared enum `ErrorCode` có các code như `SYS_VALIDATION_ERROR`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `ASSET_RACK_NOT_FOUND`, `ASSET_MARKER_NOT_FOUND`, `ASSET_CODE_CONFLICT`.
- Validation lỗi trả `invalidParams`.
- Middleware tự thêm/echo `x-request-id`, `x-correlation-id`.

Go ingestion-worker:

- Registration handler trả gRPC `PermissionDenied` khi registration fail.
- Telemetry handler trả error nếu request invalid hoặc publish fail.
- Redpanda adapter trả error khi client closed, queue full, marshal fail, context canceled.

### API response

Chuẩn target trong `CONTRACTS.md`:

```json
{
  "data": {},
  "meta": {
    "requestId": "req-id",
    "correlationId": "corr-id",
    "version": "v1",
    "timestamp": "2026-06-18T00:00:00.000Z"
  }
}
```

Error target:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {}
  },
  "meta": {
    "requestId": "req-id",
    "correlationId": "corr-id",
    "version": "v1",
    "timestamp": "2026-06-18T00:00:00.000Z"
  }
}
```

Hiện trạng:

- Asset-service hầu hết endpoint tự gọi `serializeEnvelope(data, responseMeta(request))`.
- Asset-service health cũng trả envelope.
- Identity-service có `APP_INTERCEPTOR` `ApiResponseInterceptor` để wrap success response bằng `{ data, meta }`.
- Tài liệu `docs/api-contracts/control-plane/identity-service.md` đang nói identity trả raw payload. Điều này có vẻ stale so với code hiện tại vì interceptor đã được đăng ký trong `IdentityServiceModule`.

### Auth/permission

Identity-service:

- Protected endpoints dùng `JwtAuthGuard`.
- Admin user endpoints dùng `JwtAuthGuard`, `PasswordChangeRequiredGuard`, `PermissionsGuard`.
- `@RequirePermissions(PERMISSION_CODES.IDENTITY_USERS_MANAGE)` cho admin user.
- `roles.controller.ts` hiện chưa có guard.

Asset-service:

- Query/admin controllers thường dùng `JwtAuthGuard`, `PermissionsGuard`.
- Permission route-level:
  - `DASHBOARD_READ`
  - `ASSETS_HEALTH_READ`
  - `AR_ASSETS_IDENTIFY`
  - `TOPOLOGY_STRUCTURE_MANAGE`
  - `TOPOLOGY_NODES_MANAGE`
  - `MARKERS_MANAGE`
- `internal/inventory/sync` là deprecated compatibility endpoint; không xây flow mới dựa vào endpoint này.

### Frontend UI/component rules hiện tại

Hiện frontend còn scaffold, nên rule thực tế rất ít:

- App Router trong `frontend/src/app`.
- Shared UI primitive ở `frontend/src/components/ui`.
- Utility ở `frontend/src/lib`.
- Dùng `cn()` để merge className.
- `Button` dùng `cva` variants và Radix `Slot.Root` cho `asChild`.
- Tailwind tokens và shadcn CSS variables nằm trong `globals.css`.
- `components.json` yêu cầu lucide icon library.

Khi phát triển frontend tiếp:

- Đặt API client trong `src/services`.
- Đặt feature theo domain ở `src/features`.
- Route/page giữ mỏng, chỉ compose feature component.
- Không gọi `fetch/ky` rải rác trong component.
- Map backend DTO/envelope thành view model trước khi render.
- Không để WebAR runtime gọi backend trực tiếp từ scene object; bọc qua adapter/service.

### State management

Dependencies đã có:

- `@tanstack/react-query` cho server state.
- `zustand` cho client/session UI state.
- `nuqs` cho URL/query state.

Nhưng code hiện tại chưa implement state architecture. Khi thêm mới:

- Dùng React Query cho API-backed server state.
- Dùng local state hoặc Zustand cho UI/session state cần chia sẻ.
- Không tạo global store cho mọi thứ nếu không cần.
- Backend truth không được copy thành client truth dài hạn.

### TypeScript/JavaScript rules

- Frontend `strict: true`, `allowJs: true`, `noEmit: true`.
- Identity-service `strict: true`, `target: es2021`, `module: commonjs`.
- Asset-service chưa full strict; có `strictNullChecks: true`, `noImplicitAny: false`.
- Dùng explicit DTO/interface cho API boundary.
- Không leak persistence model ra public contract.
- Với asset-service, `@typescript-eslint/no-explicit-any` đang off, `no-floating-promises` warn.

## 4. Context Dự Án

### Entity/model chính

Identity:

- `IdentityUser`: user account, email, username, password hash, status, role codes, profile fields, password flags.
- `IdentityRole`: role code, name, description, permission codes.
- `IdentitySession`: user session, refresh token hash, expiry, revocation, user agent, IP.
- `RoleCode`: `IT_ADMINISTRATOR`, `SYSTEM_MONITORING_OPERATOR`, `MAINTENANCE_TECHNICIAN`.
- `UserStatus`: `ACTIVE`, `LOCKED`, `INACTIVE`.
- Permission codes gồm identity, topology, marker, dashboard, telemetry, alert, incident, ticket, AR, simulation permissions.

Asset:

- `RackEntity`: rack code, display name, lifecycle/capacity state, site/room/zone/row/position, capacity, metadata.
- `NodeEntity`: node code, hostname, rack assignment, lifecycle/assignment state, serial/vendor/model/IP, metadata.
- `MarkerEntity`: marker code, lifecycle state, target type/id, AR visibility, image target, world tracking flag.
- `NodeRuntimeSnapshotEntity`: node health, heartbeat/metrics timestamps, CPU/memory/network, active alert count, source.
- `AssetSummary`, `RackTopologyResult`, `NodeContextResult`, `MarkerResolutionResult`.

Ingestion/telemetry:

- `RegisterRequest`, `Node`, `Credentials`.
- `IngestBatchRequest`, `AgentMeta`, `BatchMeta`, `PayloadContext`, `MetricRecord`.
- `TelemetryEnvelope`: envelope ID, agent ID, received time, client DN, payload.

Collector prototype:

- `Metric`: normalized metric name/value/unit/labels/source/scope.
- Payload schema trong `playground/go-agent-collector/internal/sender/payload.go` mirror telemetry ingest payload.

### API hiện có

Identity-service global prefix:

- Default code: `API_PREFIX || "api/v1"`.
- `.env.example` đang ghi `API_PREFIX=/api/v1`. Cần kiểm tra thực tế vì Nest `setGlobalPrefix` thường không cần slash đầu.

Identity endpoints:

| Method  | Path                             | Mục đích                          |
| ------- | -------------------------------- | --------------------------------- |
| `GET`   | `/api/v1/health`                 | Health check.                     |
| `POST`  | `/api/v1/auth/login`             | Login, tạo session.               |
| `POST`  | `/api/v1/auth/refresh`           | Refresh access/refresh token.     |
| `POST`  | `/api/v1/auth/logout`            | Revoke current session.           |
| `GET`   | `/api/v1/auth/me`                | Current user profile.             |
| `POST`  | `/api/v1/auth/change-password`   | Change password, revoke sessions. |
| `GET`   | `/api/v1/roles`                  | List roles, hiện chưa guard.      |
| `POST`  | `/api/v1/admin/users`            | Create user.                      |
| `GET`   | `/api/v1/admin/users`            | List users.                       |
| `GET`   | `/api/v1/admin/users/:username`  | Search/get by username.           |
| `PATCH` | `/api/v1/admin/users/:id/status` | Update user status.               |
| `PUT`   | `/api/v1/admin/users/:id/roles`  | Assign roles.                     |

Asset-service global prefix:

- Fixed `api/v1`.
- Swagger path `api/v1/docs` nếu `SWAGGER_ENABLED` không false.

Asset endpoints:

| Method  | Path                                                 | Mục đích                                     |
| ------- | ---------------------------------------------------- | -------------------------------------------- |
| `GET`   | `/api/v1/health`                                     | Health check.                                |
| `GET`   | `/api/v1/topology/tree`                              | Full rack/node topology tree.                |
| `GET`   | `/api/v1/racks/:rackId/topology`                     | Rack topology details.                       |
| `GET`   | `/api/v1/nodes/:nodeId/context`                      | Node context, không sở hữu workload truth.   |
| `GET`   | `/api/v1/assets/by-code/:code`                       | Find asset summary by business code.         |
| `GET`   | `/api/v1/markers/resolve/:markerCode`                | Resolve marker to asset context only.        |
| `GET`   | `/api/v1/assets/search`                              | Search racks/nodes/markers.                  |
| `POST`  | `/api/v1/admin/topology/racks`                       | Create rack.                                 |
| `PATCH` | `/api/v1/admin/topology/racks/:rackId`               | Update rack fields.                          |
| `POST`  | `/api/v1/admin/topology/racks/:rackId/confirm-ready` | Rack lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/racks/:rackId/activate`      | Rack lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/racks/:rackId/drain`         | Rack lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/racks/:rackId/retire`        | Rack lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/nodes/normalize`             | Normalize discovered node into asset record. |
| `PATCH` | `/api/v1/admin/topology/nodes/:nodeId`               | Update node.                                 |
| `POST`  | `/api/v1/admin/topology/nodes/:nodeId/assign-rack`   | Assign/move node to rack.                    |
| `POST`  | `/api/v1/admin/topology/nodes/:nodeId/activate`      | Node lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/nodes/:nodeId/drain`         | Node lifecycle transition.                   |
| `POST`  | `/api/v1/admin/topology/nodes/:nodeId/retire`        | Node lifecycle transition.                   |
| `POST`  | `/api/v1/admin/markers`                              | Create marker draft.                         |
| `PATCH` | `/api/v1/admin/markers/:markerId`                    | Update marker.                               |
| `POST`  | `/api/v1/admin/markers/:markerId/generate`           | Marker lifecycle transition.                 |
| `POST`  | `/api/v1/admin/markers/:markerId/print`              | Marker lifecycle transition.                 |
| `POST`  | `/api/v1/admin/markers/:markerId/mount`              | Marker lifecycle transition.                 |
| `POST`  | `/api/v1/admin/markers/:markerId/validate`           | Marker lifecycle transition.                 |
| `POST`  | `/api/v1/admin/markers/:markerId/activate`           | Marker lifecycle transition.                 |
| `POST`  | `/api/v1/admin/markers/:markerId/remap`              | Remap marker target.                         |
| `POST`  | `/api/v1/admin/markers/:markerId/retire`             | Retire marker.                               |
| `POST`  | `/api/v1/internal/inventory/sync`                    | Deprecated compatibility endpoint.           |

Ingestion worker gRPC:

| Service                  | RPC            | Mục đích                                                                             |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------ |
| `RegistrationService`    | `RegisterNode` | Register node bằng bootstrap token, cấp certificate/private key, lưu node vào Redis. |
| `TelemetryIngestService` | `IngestBatch`  | Nhận telemetry batch, build envelope, publish Redpanda/Kafka.                        |

### Luồng dữ liệu chính hiện tại

Luồng identity:

1. Frontend/client gọi identity REST API.
2. Controller nhận DTO và context.
3. Use case xử lý auth/session/user/role.
4. Repository adapter đọc/ghi MongoDB.
5. Response được wrap envelope qua interceptor/filter.

Luồng asset:

1. Client gọi asset REST API với JWT.
2. Middleware tạo/echo request ID và correlation ID.
3. Guards kiểm tra JWT và permissions.
4. Controller gọi use case.
5. Use case làm business transition/query qua repository ports.
6. Mongoose adapter đọc/ghi MongoDB.
7. Controller trả `{ data, meta }`.

Luồng ingestion:

1. Collector/agent gọi gRPC registration hoặc telemetry ingest.
2. Registration kiểm tra bootstrap token constant-time, tạo agent ID, cấp PKI credential, lưu node vào Redis.
3. Telemetry ingest lấy client DN, map protobuf sang domain request.
4. Use case build `TelemetryEnvelope`.
5. Redpanda adapter publish envelope vào topic dạng `{domain}.{dataArea}.{status}`.

Target luồng WebAR theo docs:

1. WebAR Client scan QR marker.
2. BFF/control-plane resolve marker qua Asset Context Service.
3. BFF compose diagnostics từ asset context, monitoring, incident/ticket, AI/serving state.
4. WebAR nhận diagnostics bundle.

Hiện BFF/WebAR diagnostics bundle chưa được implement trong code chính.

### Những phần đã làm xong

- Architecture/requirement docs khá đầy đủ.
- Identity-service có auth/session/user/role flow.
- Asset-service có topology, node, rack, marker lifecycle và marker resolve.
- Shared response/error type cho asset-service.
- Ingestion-worker Go có gRPC registration và telemetry ingest.
- Docker Compose cho Redis, MongoDB, Redpanda, ingestion worker, nginx.
- Dockerfile cho identity, asset, ingestion worker.
- k3s manifests cho identity/asset.
- GitHub Actions CI/CD cho identity/asset.
- Go agent collector prototype có scrape, normalize, queue, buffer, HTTP/gRPC sender, registration.

### Những phần còn thiếu hoặc dang dở

- Frontend dashboard/WebAR chưa implement, chỉ có create-next-app scaffold.
- Control Plane API/BFF chưa có code thật.
- Monitoring Service chưa có implementation.
- Incident Workflow Service chưa có implementation.
- Simulation/Notification/Audit services chưa có implementation thật.
- TimescaleDB raw telemetry persistence chưa thấy trong code hiện tại.
- Stream processing/latest snapshot materialization chưa thấy trong code chính.
- AI Analytics/Vertex AI integration chưa implement.
- CI/CD registry chưa theo dõi frontend và ingestion-worker.
- Root pnpm workspace chưa đúng target trong `ENGINEER.md`.
- Contract docs identity có dấu hiệu stale so với interceptor hiện tại.
- `.agents/skills/backend/SKILL.md` có dấu hiệu stale vì nhắc RedisInsight/TypeORM, không khớp code hiện tại dùng Mongoose/clean architecture.

## 5. Hướng Triển Khai Tiếp

### Ưu tiên 1: Chuẩn hóa frontend API client và auth flow

Nên thêm/sửa:

- `frontend/src/services/http-client.ts`
- `frontend/src/services/identity.service.ts`
- `frontend/src/services/asset.service.ts`
- `frontend/src/types/api.ts`
- `frontend/src/features/auth/*`
- `frontend/src/hooks/*`

Cách implement:

- Dùng `ky` hoặc wrapper thống nhất.
- Support `{ data, meta }` envelope và error envelope.
- Tách auth token/session state khỏi component UI.
- Dùng React Query cho server state.
- Không hard-code raw backend persistence shape vào component.

### Ưu tiên 2: Tạo dashboard MVP

Nên thêm/sửa:

- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/features/topology/*`
- `frontend/src/features/assets/*`
- `frontend/src/components/ui/*` nếu thiếu primitive.

Cách implement:

- Start bằng topology tree, asset search, marker resolve.
- Gọi asset-service qua typed service client.
- Route page chỉ compose feature components.
- Tôn trọng permission model từ backend.

### Ưu tiên 3: Control Plane API/BFF

Nên thêm service mới theo target:

- `backend/apps/control-plane/control-plane-api/`
- `src/domain` tối thiểu hoặc không có domain truth.
- `src/use-cases` cho composition use cases.
- `src/adapters` cho identity/asset/monitoring/incident clients.
- `src/presentation` cho public REST endpoints.

Cách implement:

- BFF không sở hữu DB authoritative.
- Compose read model cho dashboard/WebAR.
- Không tạo query-only microservice khác ngoài BFF.
- Chuẩn hóa request/correlation ID.
- Chuẩn bị adapter boundary cho gRPC/REST internal calls.

### Ưu tiên 4: Monitoring Service

Nên thêm:

- `backend/apps/control-plane/monitoring-service/`
- `domain/entities` cho alert rule, alert, monitoring read model.
- `use-cases/commands` cho alert lifecycle.
- `use-cases/queries` cho alert queue/recent health.
- `adapters/persistence/mongoose`.
- `presentation/http/controllers`.

Cách implement:

- Monitoring sở hữu alert rules và alert lifecycle.
- Không để asset-service sở hữu alert/workload truth.
- Consume snapshot/alert candidate events sau khi stream processing có thật.

### Ưu tiên 5: WebAR diagnostics flow

Nên thêm/sửa:

- Frontend: `frontend/src/features/webar/*`, `frontend/src/lib/webar/*`, `frontend/src/services/diagnostics.service.ts`.
- Backend BFF: endpoint kiểu `GET /api/v1/ar/diagnostics/markers/:markerCode`.
- Asset-service: chỉ giữ marker resolve/context lookup, không nhét alert/ticket truth vào asset-service.

Cách implement:

- WebAR scan marker -> resolve marker -> fetch diagnostics bundle.
- AR runtime nằm sau adapter boundary.
- Diagnostics bundle do BFF compose từ asset, monitoring, incident/workflow, snapshot/AI.

### Ưu tiên 6: Stream processing và serving snapshot

Nên thêm:

- Data-plane service mới hoặc mở rộng ingestion pipeline theo docs.
- Redis namespace cho latest snapshot.
- TimescaleDB persistence nếu triển khai raw telemetry history.

Cách implement:

- Ingestion publish canonical event.
- Stream processor consume telemetry event.
- Build latest node snapshot vào Redis.
- Emit `snapshot.updated`.
- Giữ raw telemetry/history ở TimescaleDB, không MongoDB.

### Ưu tiên 7: CI/CD và monorepo hygiene

Nên thêm/sửa:

- `.github/service-registry.json` thêm frontend và ingestion-worker.
- `.github/workflows/*` cho frontend/ingestion.
- Root `pnpm-workspace.yaml` nếu muốn đúng target monorepo.
- Docs contract identity cần cập nhật theo envelope hiện tại.

Cách implement:

- Không phá flow CI hiện có cho identity/asset.
- Thêm service từng bước, path-based changes rõ ràng.
- Docker image tag bằng SHA như CD hiện tại.

## 6. Lưu Ý Quan Trọng Cho AI/Developer Mới

- Đừng lấy `.agents/skills/backend/SKILL.md` làm chuẩn backend cho repo này nếu nó còn nhắc RedisInsight/TypeORM. Code thật hiện tại dùng NestJS clean architecture + Mongoose.
- Đừng tìm frontend/backend thật trong `apps/`; code thật đang ở `frontend/` và `backend/apps/`.
- Đừng tự thêm raw telemetry vào MongoDB vì docs target quy định telemetry history thuộc TimescaleDB.
- Đừng để WebAR gọi raw telemetry store; phải qua backend composition.
- Đừng cho asset-service sở hữu alert/ticket/workload runtime truth.
- Đừng tạo shared package chứa business rule của một service.
- Khi thấy docs và code lệch nhau, ghi rõ trong PR/docs và cập nhật source-of-truth liên quan.
- Nếu thông tin không xác định được từ code, ghi “Chưa xác định được” thay vì đoán.

## 7. Checklist Khi Thêm Code

- Service mới có đúng bounded context không?
- Có giữ clean architecture layer không?
- Controller có mỏng không?
- DTO có validation và Swagger decorators không?
- Use case có phụ thuộc port/interface thay vì concrete persistence không?
- Error có map về envelope/problem details thống nhất không?
- Response có `data/meta` và correlation/request ID không?
- Có tránh direct DB access sang service khác không?
- Có test unit cho domain/use case và integration cho adapter quan trọng không?
- Có cập nhật docs/contract nếu public API hoặc architecture thay đổi không?
