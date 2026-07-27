export type DownstreamServiceName =
  'asset-service' | 'monitoring-service' | 'incident-workflow-service';

export type DownstreamFailureReason =
  'NOT_FOUND' | 'UNAVAILABLE' | 'VALIDATION_FAILED' | 'CONFLICT' | 'FORBIDDEN';

export class DownstreamServiceError extends Error {
  constructor(
    readonly serviceName: DownstreamServiceName,
    readonly reason: DownstreamFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'DownstreamServiceError';
  }
}
