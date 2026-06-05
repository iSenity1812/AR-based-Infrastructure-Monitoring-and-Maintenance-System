export const PERMISSION_CODES = {
  IDENTITY_USERS_MANAGE: 'identity.users.manage',
  AUDIT_TRAIL_READ: 'audit.trail.read',
  TOPOLOGY_NODES_MANAGE: 'topology.nodes.manage',
  TOPOLOGY_STRUCTURE_MANAGE: 'topology.structure.manage',
  MARKERS_MANAGE: 'markers.manage',
  ALERT_RULES_MANAGE: 'alert.rules.manage',
  DASHBOARD_READ: 'dashboard.read',
  ASSETS_HEALTH_READ: 'assets.health.read',
  TELEMETRY_HISTORY_READ: 'telemetry.history.read',
  ALERTS_QUEUE_READ: 'alerts.queue.read',
  INCIDENTS_CREATE: 'incidents.create',
  TICKETS_DISPATCH: 'tickets.dispatch',
  AR_INSPECTIONS_CONDUCT: 'ar.inspections.conduct',
  AR_ASSETS_IDENTIFY: 'ar.assets.identify',
  AR_DIAGNOSTICS_READ: 'ar.diagnostics.read',
  AR_INSPECTION_RESULTS_SUBMIT: 'ar.inspection-results.submit',
  SIMULATION_SCENARIOS_RUN: 'simulation.scenarios.run',
  SIMULATION_FAULTS_INJECT: 'simulation.faults.inject',
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
