import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { MonitoringScopeType } from '../../../../domain/constants/monitoring-scope-type.enum';

class MonitoringInputFieldDto {
  metricKey!: string;
  value!: number | string | boolean | null;
  unit?: string;
  source?: string;
  observedAt!: Date;
}

export class IngestMonitoringContextRequestDto {
  @IsEnum(MonitoringScopeType)
  scopeType!: MonitoringScopeType;

  @IsString()
  scopeId!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsObject()
  identity?: Record<string, MonitoringInputFieldDto>;

  @IsOptional()
  @IsObject()
  relations?: Record<string, MonitoringInputFieldDto>;

  @IsOptional()
  @IsObject()
  capacity?: Record<string, MonitoringInputFieldDto>;

  @IsOptional()
  @IsObject()
  inventory?: Record<string, MonitoringInputFieldDto>;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, MonitoringInputFieldDto>;

  @IsInt()
  batchSequence!: number;

  @IsOptional()
  @IsString()
  deliveryIdentity?: string;

  @IsDateString()
  updatedAt!: string;
}

export class IngestMonitoringSnapshotRequestDto {
  @IsEnum(MonitoringScopeType)
  scopeType!: MonitoringScopeType;

  @IsString()
  scopeId!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsObject()
  metrics!: Record<string, MonitoringInputFieldDto>;

  @IsInt()
  batchSequence!: number;

  @IsDateString()
  updatedAt!: string;
}
