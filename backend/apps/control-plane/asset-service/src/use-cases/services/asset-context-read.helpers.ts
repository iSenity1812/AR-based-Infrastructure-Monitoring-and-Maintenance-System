import { AssetType } from '@domain/constants/asset-type.enum';
import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import type { AssetSummary } from '@domain/entities/asset-context.entities';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';

export function buildAssetSummary(
  id: string,
  type: AssetType,
  code: string,
  name: string,
  lifecycleState?: string,
): AssetSummary {
  return { id, type, code, name, lifecycleState };
}

export function filterAssetSummaries(
  assets: AssetSummary[],
  query?: string,
): AssetSummary[] {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) {
    return assets;
  }

  return assets.filter(
    (asset) =>
      asset.code.toLowerCase().includes(normalizedQuery) ||
      asset.name.toLowerCase().includes(normalizedQuery),
  );
}

export function getMarkerTargetErrorCode(
  targetType: MarkerTargetType,
): ErrorCode {
  switch (targetType) {
    case MarkerTargetType.RACK:
      return ErrorCode.ASSET_RACK_NOT_FOUND;
    case MarkerTargetType.NODE:
      return ErrorCode.ASSET_NODE_NOT_FOUND;
    default:
      return ErrorCode.ASSET_MARKER_TARGET_INVALID;
  }
}
