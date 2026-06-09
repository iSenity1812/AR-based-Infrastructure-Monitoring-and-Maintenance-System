const rackLifecycleState = {
  CREATED: 'CREATED',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  DRAINING: 'DRAINING',
  RETIRED: 'RETIRED',
};

const rackCapacityState = {
  AVAILABLE: 'AVAILABLE',
  EXPANDING: 'EXPANDING',
  FULL: 'FULL',
};

const nodeLifecycleState = {
  DISCOVERED: 'DISCOVERED',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  DRAINING: 'DRAINING',
  RETIRED: 'RETIRED',
};

const nodeAssignmentState = {
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  MOVED: 'MOVED',
};

const markerLifecycleState = {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  PRINTED: 'PRINTED',
  MOUNTED: 'MOUNTED',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  REMAPPED: 'REMAPPED',
  RETIRED: 'RETIRED',
};

const nodeHealthState = {
  ONLINE: 'ONLINE',
  UNKNOWN: 'UNKNOWN',
};

function mapRackLifecycleState(status) {
  switch ((status ?? '').toUpperCase()) {
    case 'READY':
      return rackLifecycleState.READY;
    case 'ACTIVE':
      return rackLifecycleState.ACTIVE;
    case 'DRAINING':
      return rackLifecycleState.DRAINING;
    case 'RETIRED':
      return rackLifecycleState.RETIRED;
    default:
      return rackLifecycleState.CREATED;
  }
}

function mapRackCapacityState(value) {
  switch ((value ?? '').toUpperCase()) {
    case 'EXPANDING':
      return rackCapacityState.EXPANDING;
    case 'FULL':
      return rackCapacityState.FULL;
    default:
      return rackCapacityState.AVAILABLE;
  }
}

function mapNodeLifecycleState(status) {
  switch ((status ?? '').toUpperCase()) {
    case 'READY':
    case 'ASSIGN':
      return nodeLifecycleState.READY;
    case 'ACTIVE':
      return nodeLifecycleState.ACTIVE;
    case 'DRAINING':
    case 'OFFLINE':
    case 'RECOVERY':
      return nodeLifecycleState.DRAINING;
    case 'RETIRED':
      return nodeLifecycleState.RETIRED;
    default:
      return nodeLifecycleState.DISCOVERED;
  }
}

async function archiveCollection(db, sourceName, archiveName) {
  const source = db.collection(sourceName);
  const archive = db.collection(archiveName);
  const documents = await source.find().toArray();

  for (const document of documents) {
    await archive.updateOne(
      { _id: document._id },
      {
        $setOnInsert: {
          ...document,
          archivedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  }

  return documents.length;
}

module.exports = {
  async up(db) {
    const racks = db.collection('racks');
    const nodes = db.collection('nodes');
    const markers = db.collection('markers');
    const snapshots = db.collection('node_runtime_snapshots');

    const legacyRackDocs = await racks.find().toArray();
    for (const rack of legacyRackDocs) {
      await racks.updateOne(
        { _id: rack._id },
        {
          $set: {
            code: rack.rackCode ?? rack.code,
            rackCode: rack.rackCode ?? rack.code,
            displayName: rack.displayName ?? rack.name ?? rack.code,
            lifecycleState:
              rack.lifecycleState ?? mapRackLifecycleState(rack.status),
            capacityState:
              rack.capacityState ?? mapRackCapacityState(rack.capacityState),
            siteCode: rack.siteCode ?? rack.site,
            roomCode: rack.roomCode,
            zoneCode: rack.zoneCode ?? rack.zone,
            rowCode: rack.rowCode,
            positionCode: rack.positionCode ?? rack.position,
            capacityLimit: rack.capacityLimit,
            notes: rack.notes,
            vendor: rack.vendor,
            metadata: rack.metadata ?? {},
          },
          $unset: {
            name: '',
            site: '',
            zone: '',
            position: '',
            status: '',
          },
        },
      );
    }

    const legacyNodeDocs = await nodes.find().toArray();
    for (const node of legacyNodeDocs) {
      const lifecycleState =
        node.lifecycleState ?? mapNodeLifecycleState(node.status);

      await nodes.updateOne(
        { _id: node._id },
        {
          $set: {
            code: node.nodeCode ?? node.code,
            nodeCode: node.nodeCode ?? node.code,
            displayName: node.displayName ?? node.name ?? node.code,
            hostname: node.hostname,
            rackId: node.rackId,
            nodeType: node.nodeType,
            source: node.source ?? 'migration',
            lifecycleState,
            assignmentState:
              node.assignmentState ??
              (node.rackId
                ? nodeAssignmentState.ASSIGNED
                : nodeAssignmentState.UNASSIGNED),
            serialNumber: node.serialNumber,
            vendor: node.vendor,
            model: node.model,
            managementIp: node.managementIp,
            notes: node.notes,
            metadata: node.metadata ?? {},
          },
          $unset: {
            name: '',
            status: '',
            switchId: '',
          },
        },
      );

      await snapshots.updateOne(
        { nodeId: String(node._id) },
        {
          $setOnInsert: {
            nodeId: String(node._id),
            healthState:
              lifecycleState === nodeLifecycleState.ACTIVE
                ? nodeHealthState.ONLINE
                : nodeHealthState.UNKNOWN,
            source: 'migration',
            metadata: { migrated: true },
          },
        },
        { upsert: true },
      );
    }

    const legacyMarkerDocs = await markers.find().toArray();
    for (const marker of legacyMarkerDocs) {
      const targetType =
        marker.targetType === 'switch' ? undefined : marker.targetType;

      await markers.updateOne(
        { _id: marker._id },
        {
          $set: {
            code: marker.markerCode ?? marker.code,
            markerCode: marker.markerCode ?? marker.code,
            displayLabel: marker.displayLabel ?? marker.label,
            lifecycleState:
              marker.lifecycleState ?? markerLifecycleState.DRAFT,
            targetType,
            targetId: marker.targetId,
            bindingStatus:
              marker.bindingStatus ??
              (targetType ? 'BOUND_PENDING_VALIDATION' : 'UNBOUND'),
            isActive: marker.isActive ?? false,
            isVisibleInAr: marker.isVisibleInAr ?? false,
            imageTargetId: marker.imageTargetId,
            worldTrackingEnabled: marker.worldTrackingEnabled ?? true,
            lastValidatedAt: marker.lastValidatedAt,
            notes: marker.notes,
            metadata: marker.metadata ?? {},
          },
          $unset: {
            label: '',
          },
        },
      );
    }

    await archiveCollection(db, 'switches', 'legacy_switches');
    await archiveCollection(db, 'services', 'legacy_services');
    await archiveCollection(db, 'containers', 'legacy_containers');
  },

  async down(db) {
    const racks = db.collection('racks');
    const nodes = db.collection('nodes');
    const markers = db.collection('markers');

    const migratedRacks = await racks.find().toArray();
    for (const rack of migratedRacks) {
      await racks.updateOne(
        { _id: rack._id },
        {
          $set: {
            code: rack.code ?? rack.rackCode,
            name: rack.name ?? rack.displayName,
            site: rack.site ?? rack.siteCode,
            zone: rack.zone ?? rack.zoneCode,
            position: rack.position ?? rack.positionCode,
          },
          $unset: {
            rackCode: '',
            displayName: '',
            lifecycleState: '',
            capacityState: '',
            siteCode: '',
            roomCode: '',
            zoneCode: '',
            rowCode: '',
            positionCode: '',
            capacityLimit: '',
            notes: '',
            vendor: '',
          },
        },
      );
    }

    const migratedNodes = await nodes.find().toArray();
    for (const node of migratedNodes) {
      await nodes.updateOne(
        { _id: node._id },
        {
          $set: {
            code: node.code ?? node.nodeCode,
            name: node.name ?? node.displayName,
            status: node.status ?? node.lifecycleState?.toLowerCase(),
          },
          $unset: {
            nodeCode: '',
            displayName: '',
            nodeType: '',
            source: '',
            lifecycleState: '',
            assignmentState: '',
            serialNumber: '',
            vendor: '',
            model: '',
            managementIp: '',
            notes: '',
          },
        },
      );
    }

    const migratedMarkers = await markers.find().toArray();
    for (const marker of migratedMarkers) {
      await markers.updateOne(
        { _id: marker._id },
        {
          $set: {
            code: marker.code ?? marker.markerCode,
            label: marker.label ?? marker.displayLabel,
          },
          $unset: {
            markerCode: '',
            displayLabel: '',
            lifecycleState: '',
            bindingStatus: '',
            isActive: '',
            isVisibleInAr: '',
            imageTargetId: '',
            worldTrackingEnabled: '',
            lastValidatedAt: '',
            notes: '',
          },
        },
      );
    }

    await db.collection('legacy_switches').drop().catch(() => undefined);
    await db.collection('legacy_services').drop().catch(() => undefined);
    await db.collection('legacy_containers').drop().catch(() => undefined);
    await db.collection('node_runtime_snapshots').drop().catch(() => undefined);
  },
};
