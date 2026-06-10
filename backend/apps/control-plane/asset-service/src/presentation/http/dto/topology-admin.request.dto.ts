import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  IsInt,
} from 'class-validator';

import { RackCapacityState } from '@domain/entities/asset-context.entities';

export class CreateRackRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rackCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rowCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateRackRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ enum: RackCapacityState })
  @IsOptional()
  @IsEnum(RackCapacityState)
  capacityState?: RackCapacityState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rowCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class NormalizeNodeRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nodeCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  source!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managementIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateNodeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managementIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AssignNodeToRackRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rackId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDraining?: boolean;
}
