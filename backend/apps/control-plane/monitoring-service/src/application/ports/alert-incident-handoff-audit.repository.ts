export type AlertIncidentHandoffAuditResult =
  | 'requested'
  | 'created'
  | 'already_linked'
  | 'linked_existing'
  | 'failed';

export interface AlertIncidentHandoffAuditRecord {
  fingerprint: string;
  action: 'incident_escalation_requested';
  actorUserId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorSessionId: string;
  correlationId: string | null;
  severityOverride: 'HIGH' | 'CRITICAL' | null;
  operatorNote: string | null;
  requestedAt: string;
  result: AlertIncidentHandoffAuditResult;
  incidentId: string | null;
  incidentCode: string | null;
  failureCode: string | null;
  failureDetail: string | null;
}

export abstract class AlertIncidentHandoffAuditRepository {
  abstract append(
    record: AlertIncidentHandoffAuditRecord,
  ): Promise<void>;
}
