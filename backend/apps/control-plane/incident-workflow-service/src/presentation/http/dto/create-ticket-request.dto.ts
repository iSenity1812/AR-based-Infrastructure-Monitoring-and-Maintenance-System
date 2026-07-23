import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketAssetType } from '@domain/constants/ticket-asset-type.enum';

export class TicketAssetReferenceRequestDto {
  @ApiProperty({ enum: TicketAssetType })
  @IsEnum(TicketAssetType)
  type!: TicketAssetType;

  @ApiProperty()
  @IsString()
  assetId!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackCode?: string;
}

export class CreateTicketRequestDto {
  @ApiProperty()
  @IsString()
  ticketCode!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeUserId?: string;

  @ApiPropertyOptional({ type: TicketAssetReferenceRequestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TicketAssetReferenceRequestDto)
  assetRef?: TicketAssetReferenceRequestDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
