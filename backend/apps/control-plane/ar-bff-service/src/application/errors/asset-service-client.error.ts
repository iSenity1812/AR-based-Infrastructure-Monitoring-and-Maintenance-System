export type AssetMarkerResolutionFailureReason =
  | 'MARKER_NOT_FOUND'
  | 'MARKER_NOT_ACTIVE'
  | 'MARKER_UNMOUNTED'
  | 'MARKER_TARGET_INVALID'
  | 'ASSET_SERVICE_UNAVAILABLE';

export class AssetServiceClientError extends Error {
  constructor(
    readonly reason: AssetMarkerResolutionFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'AssetServiceClientError';
  }
}
