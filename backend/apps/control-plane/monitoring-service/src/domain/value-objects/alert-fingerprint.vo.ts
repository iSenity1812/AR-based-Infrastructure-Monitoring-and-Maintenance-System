import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';

export interface AlertFingerprintParts {
  ruleId: string;
  scopeType: MonitoringScopeType;
  scopeId: string;
  metricKey?: string;
}

export class AlertFingerprint {
  static fromParts(parts: AlertFingerprintParts): string {
    return [
      parts.ruleId.trim(),
      parts.scopeType,
      parts.scopeId.trim(),
      parts.metricKey?.trim(),
    ]
      .filter((part): part is string => Boolean(part))
      .join('|');
  }
}
