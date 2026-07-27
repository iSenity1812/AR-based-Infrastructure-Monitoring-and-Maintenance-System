import type {
  IncidentContextNodeDataRecord,
  IncidentContextNodeInvestigationRecord,
  IncidentContextNodeLivenessRecord,
  IncidentContextRackInvestigationRecord,
} from '../services/incident-context-snapshot.contract';

export abstract class IncidentContextReadRepository {
  abstract getNodeContext(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<IncidentContextNodeDataRecord>;

  abstract getNodeLiveness(input: {
    nodeId: string;
  }): Promise<IncidentContextNodeLivenessRecord | null>;

  abstract getNodeInvestigation(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<IncidentContextNodeInvestigationRecord>;

  abstract getRackInvestigation(input: {
    rackId: string;
    from: string;
    to: string;
    interval: '1m' | '5m';
  }): Promise<IncidentContextRackInvestigationRecord>;
}
