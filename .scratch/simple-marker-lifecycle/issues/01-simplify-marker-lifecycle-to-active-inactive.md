# 01 — Simplify Marker Lifecycle To Active/Inactive

**What to build:** Replace the current multi-step marker lifecycle with a two-state AR-facing lifecycle where markers are either inactive or active. Admin users can create, activate, deactivate, and remap markers, while AR scan/resolve only works for active markers.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Marker lifecycle supports only `INACTIVE` and `ACTIVE` as main states.
- [x] New markers are created as `INACTIVE`, with `isActive = false` and `isVisibleInAr = false`.
- [x] Activating a marker changes it to `ACTIVE`, with `isActive = true` and `isVisibleInAr = true`.
- [x] Deactivating a marker changes it to `INACTIVE`, with `isActive = false` and `isVisibleInAr = false`.
- [x] Remapping a marker changes it back to `INACTIVE`, so the new asset binding must be explicitly activated.
- [x] AR marker resolution rejects inactive markers and only resolves active markers.
- [x] Admin marker APIs keep create, activate, deactivate, and remap behavior.
- [x] Generate, print, mount, validate, and retire marker workflow endpoints are removed for the MVP.
- [x] Existing seed/demo marker data is updated to use the simplified lifecycle.
- [x] Tests cover create, activate, deactivate, remap-to-inactive, active scan success, and inactive scan rejection.

**Verification**

- `pnpm exec eslint "<scoped touched files>"` passed.
- `pnpm test -- marker.commands.spec.ts asset-context-read.service.spec.ts topology.commands.spec.ts` passed.
- `pnpm build` passed.
- Full `pnpm lint` still fails on an unrelated existing unsafe `any` assignment in `src/use-cases/commands/topology/node-topology.commands.ts`.
- Full `pnpm test` still fails in unrelated existing suites: `mongoose-node.repository.spec.ts`, `discovered-node.commands.spec.ts`, and `mongoose-rack.repository.spec.ts`.
