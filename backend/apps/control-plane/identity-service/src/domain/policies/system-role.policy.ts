import { PERMISSION_CODES, type PermissionCode } from '../constants/permission-code.constant';
import { RoleCode } from '../constants/role-code.enum';
import { IdentityRole } from '../entities/identity-role.entity';

export const SYSTEM_ROLE_POLICY: Array<{
  code: RoleCode;
  name: string;
  description: string;
  permissionCodes: PermissionCode[];
}> = [
  {
    code: RoleCode.IT_ADMINISTRATOR,
    name: 'IT Administrator',
    description:
      'Manages access, topology, markers, alert rules, and monitoring oversight.',
    permissionCodes: [
      PERMISSION_CODES.IDENTITY_USERS_MANAGE,
      PERMISSION_CODES.AUDIT_TRAIL_READ,
      PERMISSION_CODES.TOPOLOGY_NODES_MANAGE,
      PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE,
      PERMISSION_CODES.MARKERS_MANAGE,
      PERMISSION_CODES.ALERT_RULES_MANAGE,
      PERMISSION_CODES.DASHBOARD_READ,
      PERMISSION_CODES.ASSETS_HEALTH_READ,
      PERMISSION_CODES.TELEMETRY_HISTORY_READ,
      PERMISSION_CODES.INCIDENTS_READ,
      PERMISSION_CODES.INCIDENTS_CREATE,
      PERMISSION_CODES.AR_ASSETS_IDENTIFY,
      PERMISSION_CODES.TICKETS_READ,
      PERMISSION_CODES.TICKETS_CREATE,
      PERMISSION_CODES.TICKETS_DISPATCH,
      PERMISSION_CODES.TICKETS_ASSIGN,
      PERMISSION_CODES.TICKETS_STATUS_UPDATE,
      PERMISSION_CODES.TICKETS_COMMENT,
      PERMISSION_CODES.TICKETS_CLOSE,
      PERMISSION_CODES.TICKETS_CANCEL,
    ],
  },
  {
    code: RoleCode.SYSTEM_MONITORING_OPERATOR,
    name: 'System Monitoring Operator',
    description:
      'Performs monitoring, incident handling, ticket dispatch, and simulation actions.',
    permissionCodes: [
      PERMISSION_CODES.DASHBOARD_READ,
      PERMISSION_CODES.ASSETS_HEALTH_READ,
      PERMISSION_CODES.TELEMETRY_HISTORY_READ,
      PERMISSION_CODES.ALERTS_QUEUE_READ,
      PERMISSION_CODES.INCIDENTS_READ,
      PERMISSION_CODES.INCIDENTS_CREATE,
      PERMISSION_CODES.TICKETS_READ,
      PERMISSION_CODES.TICKETS_CREATE,
      PERMISSION_CODES.TICKETS_DISPATCH,
      PERMISSION_CODES.TICKETS_ASSIGN,
      PERMISSION_CODES.TICKETS_STATUS_UPDATE,
      PERMISSION_CODES.TICKETS_COMMENT,
      PERMISSION_CODES.TICKETS_CLOSE,
      PERMISSION_CODES.TICKETS_CANCEL,
      PERMISSION_CODES.SIMULATION_SCENARIOS_RUN,
      PERMISSION_CODES.SIMULATION_FAULTS_INJECT,
    ],
  },
  {
    code: RoleCode.MAINTENANCE_TECHNICIAN,
    name: 'Maintenance Technician',
    description:
      'Performs AR inspection, marker-based asset identification, diagnostics review, and result submission.',
    permissionCodes: [
      PERMISSION_CODES.TICKETS_READ,
      PERMISSION_CODES.TICKETS_ACKNOWLEDGE,
      PERMISSION_CODES.TICKETS_WORK_START,
      PERMISSION_CODES.TICKETS_COMMENT,
      PERMISSION_CODES.TICKETS_EVIDENCE_ATTACH,
      PERMISSION_CODES.TICKETS_RESOLVE,
      PERMISSION_CODES.AR_INSPECTIONS_CONDUCT,
      PERMISSION_CODES.AR_ASSETS_IDENTIFY,
      PERMISSION_CODES.AR_DIAGNOSTICS_READ,
      PERMISSION_CODES.AR_INSPECTION_RESULTS_SUBMIT,
    ],
  },
];

export function buildSystemRoles(): IdentityRole[] {
  return SYSTEM_ROLE_POLICY.map(
    (role) =>
      new IdentityRole({
        ...role,
        isSystem: true,
      }),
  );
}
