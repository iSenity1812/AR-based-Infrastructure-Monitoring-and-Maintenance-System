export interface RackContextRecord {
  id: string;
  rackCode: string;
  displayName: string;
  lifecycleState: string;
  capacityState: string;
  siteCode?: string;
  roomCode?: string;
  zoneCode?: string;
  rowCode?: string;
  positionCode?: string;
  capacityLimit?: number;
  notes?: string;
  vendor?: string;
  metadata?: Record<string, unknown>;
}

export abstract class RackContextProvider {
  abstract batchGetRacks(
    rackIds: string[],
  ): Promise<Map<string, RackContextRecord>>;
}
