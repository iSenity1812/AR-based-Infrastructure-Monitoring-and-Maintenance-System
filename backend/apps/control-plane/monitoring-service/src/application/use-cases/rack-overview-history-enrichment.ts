import type {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
} from '../ports/rack-overview-read.repository';

export type RackOverviewHistoryEnrichment = {
  severityTrendDelta1m: number;
  severityTrendDelta5m: number;
  lastChangeAgeSec: number | null;
};

export function buildRackOverviewHistoryEnrichment(
  rack: RackOverviewCurrentRackRecord,
  history: RackOverviewHistoryRecord[],
  generatedAt: Date,
): RackOverviewHistoryEnrichment {
  const rackHistory = history.filter((entry) => entry.rackId === rack.rackId);

  return {
    severityTrendDelta1m: computeSeverityTrendDelta(
      rack,
      rackHistory,
      '1m',
      generatedAt,
    ),
    severityTrendDelta5m: computeSeverityTrendDelta(
      rack,
      rackHistory,
      '5m',
      generatedAt,
    ),
    lastChangeAgeSec: computeLastChangeAgeSec(rack, rackHistory, generatedAt),
  };
}

function computeSeverityTrendDelta(
  rack: RackOverviewCurrentRackRecord,
  history: RackOverviewHistoryRecord[],
  granularity: '1m' | '5m',
  generatedAt: Date,
): number {
  const previousRow = findPreviousHistoryRow(history, granularity, generatedAt);

  if (!previousRow) {
    return 0;
  }

  return rack.rackSeverityCode - previousRow.rackSeverityCode;
}

function computeLastChangeAgeSec(
  rack: RackOverviewCurrentRackRecord,
  history: RackOverviewHistoryRecord[],
  generatedAt: Date,
): number | null {
  const sorted1mRows = history
    .filter((entry) => entry.bucketGranularity === '1m')
    .sort(
      (left, right) => toTime(right.bucketStart) - toTime(left.bucketStart),
    );

  if (sorted1mRows.length === 0) {
    return null;
  }

  let oldestMatchingBucketStart: string | null = null;

  for (const row of sorted1mRows) {
    if (row.rackSeverityCode !== rack.rackSeverityCode) {
      break;
    }

    oldestMatchingBucketStart = row.bucketStart;
  }

  if (!oldestMatchingBucketStart) {
    return null;
  }

  const ageMs = generatedAt.getTime() - toTime(oldestMatchingBucketStart);
  return ageMs >= 0 ? Math.floor(ageMs / 1000) : 0;
}

function findPreviousHistoryRow(
  history: RackOverviewHistoryRecord[],
  granularity: '1m' | '5m',
  generatedAt: Date,
): RackOverviewHistoryRecord | undefined {
  const currentBucketStart = floorToBucketStart(generatedAt, granularity);

  return history
    .filter((entry) => entry.bucketGranularity === granularity)
    .sort((left, right) => toTime(right.bucketStart) - toTime(left.bucketStart))
    .find((entry) => toTime(entry.bucketStart) < currentBucketStart.getTime());
}

function floorToBucketStart(date: Date, granularity: '1m' | '5m'): Date {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);

  if (granularity === '5m') {
    bucket.setMinutes(Math.floor(bucket.getMinutes() / 5) * 5);
  }

  return bucket;
}

function toTime(value: string): number {
  return new Date(value).getTime();
}
