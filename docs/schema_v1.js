/**
 * MongoDB schema v1 for the AR + AI simulated data center monitoring platform.
 *
 * This file is intentionally standalone. It does not require npm packages.
 * It can be read as a schema artifact, or loaded in mongosh and applied with:
 *
 *   load(".misc/schema_v1.js")
 *   applySchemaV1(db)
 *
 * Modeling notes:
 * - Stable topology documents are referenced: racks, nodes, containers, markers.
 * - High-volume observability data is separated: telemetry_samples, service_logs.
 * - Bounded operational histories are embedded: checklist, statusHistory, scannedMarkers.
 * - Every collection includes schemaVersion for future migrations.
 */

const SCHEMA_VERSION = 1;

const enums = {
  userRoles: ["ADMIN", "NOC_ENGINEER", "TECHNICIAN", "SIMULATION_OPERATOR"],
  userStatus: ["ACTIVE", "LOCKED", "DISABLED"],
  infrastructureStatus: ["NORMAL", "DEGRADED", "CRITICAL", "MAINTENANCE", "OFFLINE"],
  nodeTypes: ["COMPUTE", "STORAGE", "NETWORK", "MOCK_SERVICE_HOST"],
  containerStatus: ["RUNNING", "RESTARTING", "STOPPED", "FAILED", "UNKNOWN"],
  containerHealthStatus: ["HEALTHY", "UNHEALTHY", "STARTING", "NONE"],
  markerTypes: ["QR", "ARUCO"],
  markerTargetTypes: ["RACK", "NODE"],
  telemetrySources: ["COLLECTOR", "SIMULATOR", "AI_GENERATED"],
  logLevels: ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
  alertTargetScopes: ["NODE", "CONTAINER", "SERVICE", "RACK"],
  alertOperators: ["GT", "GTE", "LT", "LTE", "EQ", "NE"],
  severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  alertStatus: ["OPEN", "ACKNOWLEDGED", "IN_INCIDENT", "RESOLVED", "SUPPRESSED"],
  alertClassification: ["TRUE_POSITIVE", "FALSE_POSITIVE", "NEEDS_REVIEW"],
  aiModelTypes: ["ANOMALY_DETECTION", "FORECASTING", "RUL_ESTIMATION"],
  aiModelStatus: ["ACTIVE", "INACTIVE", "EXPERIMENTAL"],
  riskLevels: ["NORMAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
  incidentStatus: ["OPEN", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
  priority: ["P1", "P2", "P3", "P4"],
  ticketStatus: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CANCELLED"],
  checklistStatus: ["PENDING", "IN_PROGRESS", "DONE", "SKIPPED", "FAILED"],
  commentVisibility: ["INTERNAL", "TEAM"],
  arSessionStatus: ["ACTIVE", "ENDED", "EXPIRED"],
  inspectionStatus: ["OBSERVED", "CHECKED", "FAILED_CHECK", "RESOLVED"],
  simulationRunStatus: ["PENDING", "RUNNING", "PAUSED", "STOPPED", "COMPLETED", "FAILED"],
  simulationEventTypes: ["CPU_SPIKE", "MEMORY_LEAK", "NETWORK_DEGRADATION", "CONTAINER_FAILURE", "RECOVERY"],
  notificationEventTypes: ["ALERT_CREATED", "INCIDENT_ASSIGNED", "TICKET_UPDATED", "AI_RISK_CHANGED"],
  notificationChannels: ["IN_APP", "WEBHOOK", "EMAIL_PLACEHOLDER"],
  notificationStatus: ["PENDING", "SENT", "FAILED", "SKIPPED"],
};

const field = {
  objectId: { bsonType: "objectId" },
  nullableObjectId: { bsonType: ["objectId", "null"] },
  string: { bsonType: "string" },
  nullableString: { bsonType: ["string", "null"] },
  bool: { bsonType: "bool" },
  date: { bsonType: "date" },
  nullableDate: { bsonType: ["date", "null"] },
  int: { bsonType: ["int", "long"] },
  number: { bsonType: ["int", "long", "double", "decimal"] },
  object: { bsonType: "object" },
  nullableObject: { bsonType: ["object", "null"] },
  stringArray: { bsonType: "array", items: { bsonType: "string" } },
  objectIdArray: { bsonType: "array", items: { bsonType: "objectId" } },
};

function enumField(values) {
  return { bsonType: "string", enum: values };
}

function nullableEnumField(values) {
  return { bsonType: ["string", "null"], enum: values.concat([null]) };
}

function objectIdArray(description) {
  return {
    bsonType: "array",
    description,
    items: { bsonType: "objectId" },
  };
}

function numberField(description) {
  return {
    bsonType: ["int", "long", "double", "decimal"],
    description,
  };
}

function schema(required, properties) {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: ["schemaVersion"].concat(required),
      additionalProperties: true,
      properties: Object.assign(
        {
          _id: field.objectId,
          schemaVersion: {
            bsonType: "int",
            enum: [SCHEMA_VERSION],
            description: "Schema migration version.",
          },
        },
        properties,
      ),
    },
  };
}

const collectionSchemas = {
  users: {
    validator: schema(
      ["fullName", "email", "passwordHash", "roles", "status", "createdAt", "updatedAt"],
      {
        fullName: field.string,
        email: field.string,
        passwordHash: field.string,
        roles: {
          bsonType: "array",
          minItems: 1,
          uniqueItems: true,
          items: enumField(enums.userRoles),
        },
        status: enumField(enums.userStatus),
        lastLoginAt: field.nullableDate,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { email: 1 }, options: { unique: true, name: "ux_users_email" } },
      { key: { roles: 1, status: 1 }, options: { name: "ix_users_roles_status" } },
    ],
  },

  racks: {
    validator: schema(
      ["rackCode", "name", "status", "createdAt", "updatedAt"],
      {
        rackCode: field.string,
        name: field.string,
        locationLabel: field.nullableString,
        description: field.nullableString,
        status: enumField(enums.infrastructureStatus),
        layout: {
          bsonType: ["object", "null"],
          properties: {
            x: field.number,
            y: field.number,
            width: field.number,
            height: field.number,
            floor: field.nullableString,
            zone: field.nullableString,
          },
        },
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { rackCode: 1 }, options: { unique: true, name: "ux_racks_rackCode" } },
      { key: { status: 1 }, options: { name: "ix_racks_status" } },
    ],
  },

  nodes: {
    validator: schema(
      ["rackId", "nodeCode", "hostname", "nodeType", "status", "createdAt", "updatedAt"],
      {
        rackId: field.objectId,
        nodeCode: field.string,
        hostname: field.string,
        ipAddress: field.nullableString,
        nodeType: enumField(enums.nodeTypes),
        status: enumField(enums.infrastructureStatus),
        capacity: {
          bsonType: ["object", "null"],
          properties: {
            cpuCores: field.number,
            memoryMb: field.number,
            storageGb: field.number,
          },
        },
        lastSeenAt: field.nullableDate,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { nodeCode: 1 }, options: { unique: true, name: "ux_nodes_nodeCode" } },
      { key: { rackId: 1, status: 1 }, options: { name: "ix_nodes_rackId_status" } },
      { key: { lastSeenAt: -1 }, options: { name: "ix_nodes_lastSeenAt" } },
    ],
  },

  containers: {
    validator: schema(
      ["nodeId", "containerRuntimeId", "name", "status", "restartCount", "createdAt", "updatedAt"],
      {
        nodeId: field.objectId,
        containerRuntimeId: field.string,
        name: field.string,
        image: field.nullableString,
        serviceName: field.nullableString,
        ports: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["containerPort"],
            properties: {
              containerPort: field.int,
              hostPort: { bsonType: ["int", "long", "null"] },
              protocol: { bsonType: "string", enum: ["tcp", "udp"] },
            },
          },
        },
        status: enumField(enums.containerStatus),
        healthStatus: nullableEnumField(enums.containerHealthStatus),
        restartCount: field.int,
        lastStateChangeAt: field.nullableDate,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { containerRuntimeId: 1 }, options: { unique: true, name: "ux_containers_runtimeId" } },
      { key: { nodeId: 1, status: 1 }, options: { name: "ix_containers_nodeId_status" } },
      { key: { serviceName: 1 }, options: { name: "ix_containers_serviceName", sparse: true } },
    ],
  },

  markers: {
    validator: schema(
      ["markerCode", "markerType", "targetType", "targetId", "isActive", "createdAt", "updatedAt"],
      {
        markerCode: field.string,
        markerType: enumField(enums.markerTypes),
        targetType: enumField(enums.markerTargetTypes),
        targetId: field.objectId,
        label: field.nullableString,
        relativeOffset: {
          bsonType: ["object", "null"],
          properties: {
            position: {
              bsonType: "object",
              properties: { x: field.number, y: field.number, z: field.number },
            },
            rotation: {
              bsonType: "object",
              properties: { pitch: field.number, yaw: field.number, roll: field.number },
            },
          },
        },
        isActive: field.bool,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { markerCode: 1 }, options: { unique: true, name: "ux_markers_markerCode" } },
      { key: { targetType: 1, targetId: 1 }, options: { name: "ix_markers_target" } },
      { key: { isActive: 1 }, options: { name: "ix_markers_isActive" } },
    ],
  },

  telemetry_samples: {
    options: {
      timeseries: {
        timeField: "timestamp",
        metaField: "meta",
        granularity: "seconds",
      },
    },
    validator: schema(
      ["timestamp", "nodeId", "source", "metrics"],
      {
        timestamp: field.date,
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        source: enumField(enums.telemetrySources),
        meta: {
          bsonType: ["object", "null"],
          properties: {
            nodeId: field.objectId,
            containerId: field.nullableObjectId,
            source: enumField(enums.telemetrySources),
          },
        },
        metrics: {
          bsonType: "object",
          properties: {
            cpuPercent: numberField("CPU usage percentage."),
            memoryMb: numberField("Memory usage in MB."),
            memoryPercent: numberField("Memory usage percentage."),
            networkRxBytes: numberField("Received network bytes."),
            networkTxBytes: numberField("Transmitted network bytes."),
            storageReadBytes: numberField("Storage read bytes."),
            storageWriteBytes: numberField("Storage write bytes."),
            storagePercent: numberField("Storage usage percentage."),
          },
        },
        statusSnapshot: {
          bsonType: ["object", "null"],
          properties: {
            nodeStatus: nullableEnumField(enums.infrastructureStatus),
            containerStatus: nullableEnumField(enums.containerStatus),
            healthStatus: nullableEnumField(enums.containerHealthStatus),
            restartCount: { bsonType: ["int", "long", "null"] },
          },
        },
        simulationRunId: field.nullableObjectId,
      },
    ),
    indexes: [
      { key: { timestamp: -1 }, options: { name: "ix_telemetry_timestamp" } },
      { key: { nodeId: 1, timestamp: -1 }, options: { name: "ix_telemetry_nodeId_timestamp" } },
      { key: { containerId: 1, timestamp: -1 }, options: { name: "ix_telemetry_containerId_timestamp", sparse: true } },
      { key: { simulationRunId: 1, timestamp: -1 }, options: { name: "ix_telemetry_simulationRunId_timestamp", sparse: true } },
    ],
  },

  service_logs: {
    validator: schema(
      ["timestamp", "nodeId", "level", "message"],
      {
        timestamp: field.date,
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        level: enumField(enums.logLevels),
        message: field.string,
        source: field.nullableString,
        traceId: field.nullableString,
        metadata: field.nullableObject,
      },
    ),
    indexes: [
      { key: { nodeId: 1, timestamp: -1 }, options: { name: "ix_service_logs_nodeId_timestamp" } },
      { key: { containerId: 1, timestamp: -1 }, options: { name: "ix_service_logs_containerId_timestamp", sparse: true } },
      { key: { level: 1, timestamp: -1 }, options: { name: "ix_service_logs_level_timestamp" } },
      { key: { timestamp: 1 }, options: { name: "ttl_service_logs_timestamp_14d", expireAfterSeconds: 1209600 } },
    ],
  },

  alert_rules: {
    validator: schema(
      ["name", "targetScope", "metricPath", "operator", "threshold", "severity", "isEnabled", "createdByUserId", "createdAt", "updatedAt"],
      {
        name: field.string,
        targetScope: enumField(enums.alertTargetScopes),
        metricPath: field.string,
        operator: enumField(enums.alertOperators),
        threshold: field.number,
        durationSeconds: { bsonType: ["int", "long", "null"] },
        severity: enumField(enums.severity),
        isEnabled: field.bool,
        createdByUserId: field.objectId,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { isEnabled: 1, targetScope: 1, metricPath: 1 }, options: { name: "ix_alert_rules_enabled_scope_metric" } },
      { key: { name: 1 }, options: { name: "ix_alert_rules_name" } },
    ],
  },

  alerts: {
    validator: schema(
      ["alertCode", "nodeId", "severity", "status", "title", "createdAt"],
      {
        alertCode: field.string,
        ruleId: field.nullableObjectId,
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        severity: enumField(enums.severity),
        status: enumField(enums.alertStatus),
        title: field.string,
        description: field.nullableString,
        metricPath: field.nullableString,
        observedValue: { bsonType: ["int", "long", "double", "decimal", "null"] },
        threshold: { bsonType: ["int", "long", "double", "decimal", "null"] },
        aiInferenceIds: objectIdArray("AI inference evidence attached to the alert."),
        sourceEventId: field.nullableObjectId,
        incidentId: field.nullableObjectId,
        acknowledgedByUserId: field.nullableObjectId,
        acknowledgedAt: field.nullableDate,
        classification: nullableEnumField(enums.alertClassification),
        createdAt: field.date,
        resolvedAt: field.nullableDate,
      },
    ),
    indexes: [
      { key: { alertCode: 1 }, options: { unique: true, name: "ux_alerts_alertCode" } },
      { key: { status: 1, severity: 1, createdAt: -1 }, options: { name: "ix_alerts_status_severity_createdAt" } },
      { key: { nodeId: 1, createdAt: -1 }, options: { name: "ix_alerts_nodeId_createdAt" } },
      { key: { containerId: 1, createdAt: -1 }, options: { name: "ix_alerts_containerId_createdAt", sparse: true } },
      { key: { ruleId: 1, createdAt: -1 }, options: { name: "ix_alerts_ruleId_createdAt", sparse: true } },
      { key: { incidentId: 1 }, options: { name: "ix_alerts_incidentId", sparse: true } },
      { key: { sourceEventId: 1 }, options: { name: "ix_alerts_sourceEventId", sparse: true } },
    ],
  },

  ai_models: {
    validator: schema(
      ["name", "modelType", "version", "status", "createdAt", "updatedAt"],
      {
        name: field.string,
        modelType: enumField(enums.aiModelTypes),
        version: field.string,
        status: enumField(enums.aiModelStatus),
        parameters: field.nullableObject,
        trainedAt: field.nullableDate,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { name: 1, version: 1 }, options: { unique: true, name: "ux_ai_models_name_version" } },
      { key: { modelType: 1, status: 1 }, options: { name: "ix_ai_models_type_status" } },
    ],
  },

  ai_inferences: {
    validator: schema(
      ["modelId", "timestamp", "nodeId", "riskLevel"],
      {
        modelId: field.objectId,
        timestamp: field.date,
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        telemetrySampleIds: objectIdArray("Bounded sample evidence list."),
        windowStart: field.nullableDate,
        windowEnd: field.nullableDate,
        anomalyScore: { bsonType: ["int", "long", "double", "decimal", "null"] },
        riskLevel: enumField(enums.riskLevels),
        forecast: {
          bsonType: ["object", "null"],
          properties: {
            horizonSeconds: { bsonType: ["int", "long"] },
            predictedMetrics: field.object,
            confidence: { bsonType: ["int", "long", "double", "decimal", "null"] },
          },
        },
        explanation: field.nullableString,
        recommendation: field.nullableString,
        alertId: field.nullableObjectId,
      },
    ),
    indexes: [
      { key: { nodeId: 1, timestamp: -1 }, options: { name: "ix_ai_inferences_nodeId_timestamp" } },
      { key: { containerId: 1, timestamp: -1 }, options: { name: "ix_ai_inferences_containerId_timestamp", sparse: true } },
      { key: { riskLevel: 1, timestamp: -1 }, options: { name: "ix_ai_inferences_riskLevel_timestamp" } },
      { key: { alertId: 1 }, options: { name: "ix_ai_inferences_alertId", sparse: true } },
      { key: { modelId: 1, timestamp: -1 }, options: { name: "ix_ai_inferences_modelId_timestamp" } },
    ],
  },

  incidents: {
    validator: schema(
      ["incidentCode", "title", "status", "priority", "severity", "nodeIds", "alertIds", "statusHistory", "createdAt"],
      {
        incidentCode: field.string,
        title: field.string,
        description: field.nullableString,
        status: enumField(enums.incidentStatus),
        priority: enumField(enums.priority),
        severity: enumField(enums.severity),
        nodeIds: objectIdArray("Affected nodes."),
        containerIds: objectIdArray("Affected containers."),
        alertIds: objectIdArray("Alerts grouped into this incident."),
        createdByUserId: field.nullableObjectId,
        assignedToUserId: field.nullableObjectId,
        statusHistory: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["status", "at"],
            properties: {
              status: enumField(enums.incidentStatus),
              byUserId: field.nullableObjectId,
              at: field.date,
              note: field.nullableString,
            },
          },
        },
        createdAt: field.date,
        resolvedAt: field.nullableDate,
        closedAt: field.nullableDate,
      },
    ),
    indexes: [
      { key: { incidentCode: 1 }, options: { unique: true, name: "ux_incidents_incidentCode" } },
      { key: { status: 1, priority: 1, createdAt: -1 }, options: { name: "ix_incidents_status_priority_createdAt" } },
      { key: { assignedToUserId: 1, status: 1 }, options: { name: "ix_incidents_assignedTo_status", sparse: true } },
      { key: { nodeIds: 1, createdAt: -1 }, options: { name: "ix_incidents_nodeIds_createdAt" } },
    ],
  },

  maintenance_tickets: {
    validator: schema(
      ["ticketCode", "incidentId", "title", "status", "priority", "target", "createdAt", "updatedAt"],
      {
        ticketCode: field.string,
        incidentId: field.objectId,
        guideId: field.nullableObjectId,
        title: field.string,
        status: enumField(enums.ticketStatus),
        priority: enumField(enums.priority),
        assignedToUserId: field.nullableObjectId,
        createdByUserId: field.nullableObjectId,
        target: {
          bsonType: "object",
          required: ["nodeId"],
          properties: {
            nodeId: field.objectId,
            containerId: field.nullableObjectId,
          },
        },
        checklist: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["title", "status"],
            properties: {
              order: { bsonType: ["int", "long", "null"] },
              title: field.string,
              instruction: field.nullableString,
              expectedResult: field.nullableString,
              status: enumField(enums.checklistStatus),
              completedByUserId: field.nullableObjectId,
              completedAt: field.nullableDate,
            },
          },
        },
        resolutionSummary: field.nullableString,
        createdAt: field.date,
        updatedAt: field.date,
        resolvedAt: field.nullableDate,
      },
    ),
    indexes: [
      { key: { ticketCode: 1 }, options: { unique: true, name: "ux_maintenance_tickets_ticketCode" } },
      { key: { incidentId: 1 }, options: { name: "ix_maintenance_tickets_incidentId" } },
      { key: { assignedToUserId: 1, status: 1 }, options: { name: "ix_maintenance_tickets_assignedTo_status", sparse: true } },
      { key: { "target.nodeId": 1, status: 1 }, options: { name: "ix_maintenance_tickets_targetNode_status" } },
    ],
  },

  ticket_comments: {
    validator: schema(
      ["ticketId", "authorUserId", "body", "visibility", "createdAt"],
      {
        ticketId: field.objectId,
        authorUserId: field.objectId,
        body: field.string,
        attachments: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              type: field.nullableString,
              url: field.nullableString,
              name: field.nullableString,
              metadata: field.nullableObject,
            },
          },
        },
        visibility: enumField(enums.commentVisibility),
        createdAt: field.date,
      },
    ),
    indexes: [
      { key: { ticketId: 1, createdAt: 1 }, options: { name: "ix_ticket_comments_ticketId_createdAt" } },
      { key: { authorUserId: 1, createdAt: -1 }, options: { name: "ix_ticket_comments_author_createdAt" } },
    ],
  },

  maintenance_guides: {
    validator: schema(
      ["guideCode", "title", "steps", "isActive", "createdAt", "updatedAt"],
      {
        guideCode: field.string,
        title: field.string,
        appliesTo: {
          bsonType: ["object", "null"],
          properties: {
            metricPath: field.nullableString,
            serviceName: field.nullableString,
            severity: nullableEnumField(enums.severity),
            nodeType: nullableEnumField(enums.nodeTypes),
          },
        },
        steps: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["order", "title", "instruction"],
            properties: {
              order: field.int,
              title: field.string,
              instruction: field.string,
              expectedResult: field.nullableString,
            },
          },
        },
        riskNotes: field.nullableString,
        isActive: field.bool,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { guideCode: 1 }, options: { unique: true, name: "ux_maintenance_guides_guideCode" } },
      { key: { isActive: 1, "appliesTo.metricPath": 1 }, options: { name: "ix_maintenance_guides_active_metric" } },
      { key: { "appliesTo.serviceName": 1, isActive: 1 }, options: { name: "ix_maintenance_guides_service_active", sparse: true } },
    ],
  },

  ar_sessions: {
    validator: schema(
      ["userId", "startedAt", "status"],
      {
        userId: field.objectId,
        deviceInfo: {
          bsonType: ["object", "null"],
          properties: {
            browser: field.nullableString,
            os: field.nullableString,
            userAgent: field.nullableString,
            cameraLabel: field.nullableString,
          },
        },
        startedAt: field.date,
        endedAt: field.nullableDate,
        scannedMarkers: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["markerId", "scannedAt", "targetType", "targetId"],
            properties: {
              markerId: field.objectId,
              scannedAt: field.date,
              targetType: enumField(enums.markerTargetTypes),
              targetId: field.objectId,
            },
          },
        },
        status: enumField(enums.arSessionStatus),
      },
    ),
    indexes: [
      { key: { userId: 1, startedAt: -1 }, options: { name: "ix_ar_sessions_userId_startedAt" } },
      { key: { status: 1 }, options: { name: "ix_ar_sessions_status" } },
      { key: { endedAt: 1 }, options: { name: "ttl_ar_sessions_endedAt_30d", expireAfterSeconds: 2592000, partialFilterExpression: { endedAt: { $exists: true } } } },
    ],
  },

  ar_inspections: {
    validator: schema(
      ["arSessionId", "markerId", "nodeId", "inspectionStatus", "createdAt"],
      {
        arSessionId: field.objectId,
        ticketId: field.nullableObjectId,
        markerId: field.objectId,
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        inspectionStatus: enumField(enums.inspectionStatus),
        notes: field.nullableString,
        evidence: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              type: field.nullableString,
              url: field.nullableString,
              caption: field.nullableString,
              capturedAt: field.nullableDate,
              metadata: field.nullableObject,
            },
          },
        },
        systemSnapshot: {
          bsonType: ["object", "null"],
          properties: {
            nodeStatus: nullableEnumField(enums.infrastructureStatus),
            containerStatus: nullableEnumField(enums.containerStatus),
            healthStatus: nullableEnumField(enums.containerHealthStatus),
            activeAlertIds: field.objectIdArray,
            telemetrySampleId: field.nullableObjectId,
          },
        },
        createdAt: field.date,
      },
    ),
    indexes: [
      { key: { ticketId: 1, createdAt: -1 }, options: { name: "ix_ar_inspections_ticketId_createdAt", sparse: true } },
      { key: { nodeId: 1, createdAt: -1 }, options: { name: "ix_ar_inspections_nodeId_createdAt" } },
      { key: { arSessionId: 1, createdAt: -1 }, options: { name: "ix_ar_inspections_session_createdAt" } },
      { key: { markerId: 1, createdAt: -1 }, options: { name: "ix_ar_inspections_marker_createdAt" } },
    ],
  },

  simulation_scenarios: {
    validator: schema(
      ["name", "createdAt", "updatedAt"],
      {
        name: field.string,
        description: field.nullableString,
        topologyTemplate: field.nullableObject,
        eventTemplates: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              eventType: nullableEnumField(enums.simulationEventTypes),
              targetSelector: field.nullableObject,
              payload: field.nullableObject,
              offsetSeconds: { bsonType: ["int", "long", "null"] },
              durationSeconds: { bsonType: ["int", "long", "null"] },
            },
          },
        },
        createdByUserId: field.nullableObjectId,
        createdAt: field.date,
        updatedAt: field.date,
      },
    ),
    indexes: [
      { key: { name: 1 }, options: { name: "ix_simulation_scenarios_name" } },
      { key: { createdByUserId: 1, createdAt: -1 }, options: { name: "ix_simulation_scenarios_creator_createdAt", sparse: true } },
    ],
  },

  simulation_runs: {
    validator: schema(
      ["scenarioId", "status"],
      {
        scenarioId: field.objectId,
        status: enumField(enums.simulationRunStatus),
        startedByUserId: field.nullableObjectId,
        startedAt: field.nullableDate,
        endedAt: field.nullableDate,
        baselineSnapshot: field.nullableObject,
      },
    ),
    indexes: [
      { key: { scenarioId: 1, startedAt: -1 }, options: { name: "ix_simulation_runs_scenario_startedAt" } },
      { key: { status: 1 }, options: { name: "ix_simulation_runs_status" } },
      { key: { startedByUserId: 1, startedAt: -1 }, options: { name: "ix_simulation_runs_startedBy_startedAt", sparse: true } },
    ],
  },

  simulation_events: {
    validator: schema(
      ["runId", "eventType", "nodeId", "severity", "startedAt"],
      {
        runId: field.objectId,
        eventType: enumField(enums.simulationEventTypes),
        nodeId: field.objectId,
        containerId: field.nullableObjectId,
        severity: enumField(enums.severity),
        payload: field.nullableObject,
        startedAt: field.date,
        endedAt: field.nullableDate,
        createdAlertIds: objectIdArray("Alerts caused by this simulation event."),
      },
    ),
    indexes: [
      { key: { runId: 1, startedAt: -1 }, options: { name: "ix_simulation_events_runId_startedAt" } },
      { key: { nodeId: 1, startedAt: -1 }, options: { name: "ix_simulation_events_nodeId_startedAt" } },
      { key: { containerId: 1, startedAt: -1 }, options: { name: "ix_simulation_events_containerId_startedAt", sparse: true } },
      { key: { eventType: 1, startedAt: -1 }, options: { name: "ix_simulation_events_type_startedAt" } },
    ],
  },

  notification_events: {
    validator: schema(
      ["eventType", "channel", "payload", "status", "createdAt"],
      {
        eventType: enumField(enums.notificationEventTypes),
        targetUserId: field.nullableObjectId,
        channel: enumField(enums.notificationChannels),
        payload: field.object,
        status: enumField(enums.notificationStatus),
        createdAt: field.date,
        sentAt: field.nullableDate,
      },
    ),
    indexes: [
      { key: { status: 1, createdAt: 1 }, options: { name: "ix_notification_events_status_createdAt" } },
      { key: { targetUserId: 1, createdAt: -1 }, options: { name: "ix_notification_events_target_createdAt", sparse: true } },
    ],
  },

  audit_logs: {
    validator: schema(
      ["action", "entityType", "createdAt"],
      {
        actorUserId: field.nullableObjectId,
        action: field.string,
        entityType: field.string,
        entityId: field.nullableObjectId,
        before: field.nullableObject,
        after: field.nullableObject,
        metadata: {
          bsonType: ["object", "null"],
          properties: {
            ipAddress: field.nullableString,
            userAgent: field.nullableString,
            requestId: field.nullableString,
          },
        },
        createdAt: field.date,
      },
    ),
    indexes: [
      { key: { entityType: 1, entityId: 1, createdAt: -1 }, options: { name: "ix_audit_logs_entity_createdAt" } },
      { key: { actorUserId: 1, createdAt: -1 }, options: { name: "ix_audit_logs_actor_createdAt", sparse: true } },
      { key: { createdAt: -1 }, options: { name: "ix_audit_logs_createdAt" } },
    ],
  },
};

const relationships = [
  { from: "users", to: "audit_logs", cardinality: "1 -> 0..N", verb: "performs", foreignKey: "audit_logs.actorUserId" },
  { from: "users", to: "alert_rules", cardinality: "1 -> 0..N", verb: "creates", foreignKey: "alert_rules.createdByUserId" },
  { from: "users", to: "incidents", cardinality: "1 -> 0..N", verb: "creates or is assigned to", foreignKey: "incidents.createdByUserId/assignedToUserId" },
  { from: "users", to: "maintenance_tickets", cardinality: "1 -> 0..N", verb: "creates or is assigned to", foreignKey: "maintenance_tickets.createdByUserId/assignedToUserId" },
  { from: "users", to: "ar_sessions", cardinality: "1 -> 0..N", verb: "starts", foreignKey: "ar_sessions.userId" },
  { from: "racks", to: "nodes", cardinality: "1 -> 0..N", verb: "contains", foreignKey: "nodes.rackId" },
  { from: "nodes", to: "containers", cardinality: "1 -> 0..N", verb: "hosts", foreignKey: "containers.nodeId" },
  { from: "markers", to: "racks/nodes", cardinality: "1 -> 0..1 target", verb: "identifies", foreignKey: "markers.targetType + markers.targetId" },
  { from: "nodes", to: "telemetry_samples", cardinality: "1 -> 0..N", verb: "produces", foreignKey: "telemetry_samples.nodeId" },
  { from: "containers", to: "telemetry_samples", cardinality: "1 -> 0..N", verb: "produces", foreignKey: "telemetry_samples.containerId" },
  { from: "nodes", to: "service_logs", cardinality: "1 -> 0..N", verb: "emits", foreignKey: "service_logs.nodeId" },
  { from: "containers", to: "service_logs", cardinality: "1 -> 0..N", verb: "emits", foreignKey: "service_logs.containerId" },
  { from: "alert_rules", to: "alerts", cardinality: "1 -> 0..N", verb: "generates", foreignKey: "alerts.ruleId" },
  { from: "nodes", to: "alerts", cardinality: "1 -> 0..N", verb: "raises", foreignKey: "alerts.nodeId" },
  { from: "containers", to: "alerts", cardinality: "1 -> 0..N", verb: "raises", foreignKey: "alerts.containerId" },
  { from: "ai_models", to: "ai_inferences", cardinality: "1 -> 0..N", verb: "generates", foreignKey: "ai_inferences.modelId" },
  { from: "ai_inferences", to: "alerts", cardinality: "0..N -> 0..N", verb: "enriches or generates", foreignKey: "alerts.aiInferenceIds / ai_inferences.alertId" },
  { from: "incidents", to: "alerts", cardinality: "1 -> 1..N", verb: "aggregates", foreignKey: "incidents.alertIds + alerts.incidentId" },
  { from: "incidents", to: "maintenance_tickets", cardinality: "1 -> 0..N", verb: "results in", foreignKey: "maintenance_tickets.incidentId" },
  { from: "maintenance_guides", to: "maintenance_tickets", cardinality: "1 -> 0..N", verb: "guides", foreignKey: "maintenance_tickets.guideId" },
  { from: "maintenance_tickets", to: "ticket_comments", cardinality: "1 -> 0..N", verb: "has", foreignKey: "ticket_comments.ticketId" },
  { from: "maintenance_tickets", to: "ar_inspections", cardinality: "1 -> 0..N", verb: "is verified by", foreignKey: "ar_inspections.ticketId" },
  { from: "ar_sessions", to: "ar_inspections", cardinality: "1 -> 0..N", verb: "records", foreignKey: "ar_inspections.arSessionId" },
  { from: "simulation_scenarios", to: "simulation_runs", cardinality: "1 -> 0..N", verb: "has", foreignKey: "simulation_runs.scenarioId" },
  { from: "simulation_runs", to: "simulation_events", cardinality: "1 -> 0..N", verb: "produces", foreignKey: "simulation_events.runId" },
  { from: "simulation_events", to: "alerts", cardinality: "1 -> 0..N", verb: "causes", foreignKey: "alerts.sourceEventId" },
];

const accessPolicies = {
  service_logs: {
    rawReadRoles: ["ADMIN", "NOC_ENGINEER"],
    technicianView: "Use sanitized diagnostics derived from alerts, ai_inferences, telemetry_samples, and ticket context.",
  },
  ar_inspections: {
    writeRoles: ["TECHNICIAN"],
    reviewRoles: ["ADMIN", "NOC_ENGINEER"],
    note: "Inspection records are semi-automatic evidence records: marker scan, user, timestamp, target, and systemSnapshot are captured by the system; notes and checklist confirmation are user-provided.",
  },
};

const databaseSchemaV1 = {
  schemaVersion: SCHEMA_VERSION,
  database: "ar_ai_datacenter_monitoring",
  enums,
  collections: collectionSchemas,
  relationships,
  accessPolicies,
};

function applySchemaV1(database) {
  Object.entries(collectionSchemas).forEach(([collectionName, definition]) => {
    const existingCollections = database.getCollectionNames();
    const collectionExists = existingCollections.includes(collectionName);
    const collectionOptions = Object.assign(
      {
        validator: definition.validator,
        validationLevel: "moderate",
        validationAction: "error",
      },
      definition.options || {},
    );

    if (!collectionExists) {
      database.createCollection(collectionName, collectionOptions);
    } else {
      database.runCommand({
        collMod: collectionName,
        validator: definition.validator,
        validationLevel: "moderate",
        validationAction: "error",
      });
    }

    (definition.indexes || []).forEach((index) => {
      database.getCollection(collectionName).createIndex(index.key, index.options || {});
    });
  });

  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    collections: Object.keys(collectionSchemas),
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SCHEMA_VERSION,
    enums,
    collectionSchemas,
    relationships,
    accessPolicies,
    databaseSchemaV1,
    applySchemaV1,
  };
}
