# Spec: Get UNASSIGNED Nodes — Asset Service

> Status: Draft
> Author: asset-service maintainers
> Date: 2026-06-30
> Source request: "In asset service, implement feature 'Get UNASSIGNED node', the data should get from database not redis."

---

## 1. Goal

Add a read endpoint to the asset-service that returns nodes whose
`assignmentState` is `UNASSIGNED`, sourced from the **canonical MongoDB
`nodes` collection** — not from the transient Redis discovered-node store.

The primary consumer is the **Admin UI**, where operators browse nodes
that still need to be placed into a rack. This is the inverse of the
existing "assign node to rack" workflow.

## 2. Background: why "not Redis"

The service holds two node data stores with different semantics:

| Store | Entity | Source | Meaning |
| --- | --- | --- | --- |
| MongoDB `nodes` collection | `NodeEntity` | `NodeRepositoryPort` / `MongooseNodeRepository` | Canonical asset record; carries authoritative `assignmentState` (`UNASSIGNED | ASSOVED | MOVED`) and `lifecycleState`. |
| Redis discovered-node store | `DiscoveredNodeEntity` | `DiscoveredNodeRepositoryPort` / `RedisDiscoveredNodeRepository` | Transient, pre-normalization registration. |

`assignmentState` only lives on the canonical Mongo record. It is set to
`UNASSIGNED` when a node is normalized
(`NormalizeNodeUseCase`, `node-topology.commands.ts`) and flips to
`ASSIGNED` / `MOVED` when placed into a rack (`AssignNodeToRackUseCase`)
or back to `UNASSIGNED` on retire. So the correct, authoritative source
for "which nodes are unassigned" is the MongoDB `nodes` collection.

The existing `GET /api/v1/admin/topology/discovered-nodes` deliberately
reads from Redis and answers a different question ("what has been
registered but not yet normalized"). This new endpoint answers the
complementary question ("which canonical nodes are not yet in a rack").

## 3. Approach

**Approach A — new repository method + thin use-case** (selected).

Mirrors the existing `listByRackId` precedent
(`mongoose-node.repository.ts`) end-to-end:
repository does the DB filtering, use-case is a thin wrapper, controller
wraps in the standard `{ data: meta }` envelope.

Rejected alternatives:

- **B — `listAll()` + in-memory filter:** loads every node into the app
  and filters in JavaScript. Scales poorly and breaks the existing
  filtered-read precedent.
- **C — cache layer (`AssetContextReadService`):** that service owns
  single-entity context/topology/marker resolution + search. A
  filtered unassigned list is a different concern; caching a mutable
  list behind rack-topology invalidation would be premature.

## 4. Data flow

```
GET /api/v1/admin/topology/nodes/unassigned
   └─ AdminTopologyController.listUnassignedNodes(query)
        └─ ListUnassignedNodesUseCase.execute(filter?)
             └─ NodeRepositoryPort.listUnassigned(filter?)     ← added
                  └─ MongooseNodeRepository.listUnassigned      ← added
                       └─ nodeModel.find({
                            assignmentState: 'UNASSIGNED',
                            lifecycleState?: <optional>,
                          }).sort({ nodeCode: 1 })
```

Response envelope:

```json
{
  "data": {
    "items": [
      { "nodeCode": "NODE-1", "assignmentState": "UNASSIGNED", "lifecycleState": "READY", "...": "..." }
    ]
  },
  "meta": { "requestId": "...", "correlationId": "..." }
}
```

## 5. Work items (file by file)

### 5.1 Domain port
`src/domain/ports/repositories.port.ts` — add to `NodeRepositoryPort`:

```ts
listUnassigned(
  this: void,
  filter?: { lifecycleState?: NodeLifecycleState },
): Promise<NodeEntity[]>;
```

Import `NodeLifecycleState` from the entities module.

### 5.2 Persistence
`src/adapters/persistence/mongoose/mongoose-node.repository.ts` —
implement:

```ts
async listUnassigned(filter) {
  const query: Record<string, unknown> = {
    assignmentState: NodeAssignmentState.UNASSIGNED,
  };
  if (filter?.lifecycleState) {
    query.lifecycleState = filter.lifecycleState;
  }
  const documents = await this.nodeModel.find(query).sort({ nodeCode: 1 });
  return documents.map((document) =>
    mapNode(document as NodeDocumentModel & { _id: { toString(): string } }),
  );
}
```

Add `NodeAssignmentState` import.

### 5.3 Schema index
`src/adapters/persistence/mongoose/asset-context.models.ts` — add to
`NodeSchema`, next to the existing `rackId+positionCode` compound index:

```ts
NodeSchema.index({ assignmentState: 1 });
```

Cheap single-field index; keeps the filtered read fast as node count
grows. Mirrors the existing compound-index convention in the same file.

### 5.4 Use-case (new file)
`src/use-cases/queries/unassigned-node.queries.ts`:

```ts
@Injectable()
export class ListUnassignedNodesUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
  ) {}

  execute(filter?: { lifecycleState?: NodeLifecycleState }) {
    return this.nodeRepository.listUnassigned(filter);
  }
}
```

Thin wrapper, mirroring `discovered-node.queries.ts`.

### 5.5 Query DTO (new file)
`src/presentation/http/dto/unassigned-nodes.request.dto.ts`:

```ts
@ApiPropertyOptional({ enum: NodeLifecycleState })
@IsOptional()
@IsEnum(NodeLifecycleState)
lifecycleState?: NodeLifecycleState;
```

### 5.6 Controller endpoint
`src/presentation/http/controllers/admin-topology.controller.ts` — add:

```ts
@Get('nodes/unassigned')
@RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
@ApiOperation({ summary: 'List nodes that have not been assigned to a rack.' })
async listUnassignedNodes(
  @Query() query: UnassignedNodesRequestDto,
  @Req() request: HeaderRequest,
) {
  return serializeEnvelope(
    { items: await this.listUnassignedNodesUseCase.execute(query) },
    responseMeta(request),
  );
}
```

Wire `listUnassignedNodesUseCase` into the constructor alongside the
other use-cases. Route registered **before** `nodes/:nodeId` if the
framework allows static segments after params; NestJS resolves static
before parameterized segments, but placing it above `discovered-nodes`
keeps the topology routes grouped. Verify in smoke test.

### 5.7 DI registration
`src/infrastructure/di/asset-service.module.ts` — add
`ListUnassignedNodesUseCase` to the providers array.

### 5.8 API contract doc
`docs/api-contracts/control-plane/asset-service.md` — add an "Admin
Topology Commands" entry documenting
`GET /api/v1/admin/topology/nodes/unassigned`, its
`TOPOLOGY_NODES_MANAGE` permission, optional `lifecycleState` query
param, and the `{ data: { items }, meta }` envelope.

## 6. Testing

- **Use-case unit test** (`unassigned-node.queries.spec.ts`): fake
  `NodeRepositoryPort`; assert `execute()` returns the repository value
  and forwards `{ lifecycleState }` and `undefined` filters.
- **Repository / schema**: assert the Mongo query carries
  `assignmentState: 'UNASSIGNED'` and applies `lifecycleState` when
  supplied. Mirror the repository's existing test style; add a focused
  spec if no repository spec currently exists.
- **Smoke**: build the Nest app (module DI graph resolves), hit the new
  route with a valid token + permission, confirm `200` + empty/`
  populated items` envelope.
- **Lint + typecheck**: pass before completion.

## 7. Error handling

An empty result returns
`{ data: { items: [] }, meta }`, never 404 — consistent with the
existing `discovered-nodes` and `search` endpoints. A Mongo error
surfaces through the existing `ProblemDetailsExceptionFilter`. Invalid
`lifecycleState` values are rejected by the global `ValidationPipe`
(`whitelist`, `forbidNonWhitelisted`).

## 8. Out of scope (YAGNI)

Pagination, free sorting, cache-layer wrapping, and any mutation of
Redis discovered-node state. The `assignmentState` index is the only
persistence addition.

## 9. Acceptance criteria

- `GET /api/v1/admin/topology/nodes/unassigned?lifecycleState=READY`
  returns only canonical `nodes` rows with
  `assignmentState = UNASSIGNED` and `lifecycleState = READY` from MongoDB.
- No code path in the feature touches
  `DiscoveredNodeRepositoryPort` / Redis.
- `TOPOLOGY_NODES_MANAGE` is enforced; unauthenticated/unauthorized
  calls are rejected.
- Response is wrapped in `{ data: { items }, meta }`.
- New endpoint is documented in the asset-service API contract.
- `assignmentState` index is declared in `NodeSchema`.
- Tests, lint, and typecheck pass.
