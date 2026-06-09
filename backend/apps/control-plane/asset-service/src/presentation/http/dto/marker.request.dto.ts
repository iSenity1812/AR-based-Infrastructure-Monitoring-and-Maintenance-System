import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import { IsEnum } from 'class-validator';

export class CreateMarkerRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  markerCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayLabel?: string;

  @ApiPropertyOptional({ enum: MarkerTargetType })
  @IsOptional()
  @IsEnum(MarkerTargetType)
  targetType?: MarkerTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageTargetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  worldTrackingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMarkerRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  markerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageTargetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  worldTrackingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RemapMarkerTargetRequestDto {
  @ApiProperty({ enum: MarkerTargetType })
  @IsEnum(MarkerTargetType)
  targetType!: MarkerTargetType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
