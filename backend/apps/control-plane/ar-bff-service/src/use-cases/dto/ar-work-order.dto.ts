import type { ArAvailabilityDto, ArResolvedAssetDto } from './ar-asset.dto';

export interface ArTicketAssetRefDto {
  type: 'rack' | 'node';
  assetId: string;
  code: string;
  displayName: string;
  rackId?: string;
  rackCode?: string;
}

export interface ArWorkOrderSummaryDto {
  ticketId: string;
  ticketCode: string;
  title: string;
  priority: string;
  status: string;
  assignee?: {
    userId: string;
  };
  assetRef?: ArTicketAssetRefDto;
}

export interface ArWorkOrderListDto {
  asset: ArResolvedAssetDto;
  availability: ArAvailabilityDto;
  workOrders: ArWorkOrderSummaryDto[];
}

export interface ArCreateWorkOrderInputDto {
  ticketCode: string;
  title: string;
  description?: string;
  priority: string;
  ownerUserId?: string;
  assigneeUserId?: string;
  metadata?: Record<string, unknown>;
}

export interface ArCreateWorkOrderResultDto {
  asset: ArResolvedAssetDto;
  workOrder: ArWorkOrderSummaryDto;
}
