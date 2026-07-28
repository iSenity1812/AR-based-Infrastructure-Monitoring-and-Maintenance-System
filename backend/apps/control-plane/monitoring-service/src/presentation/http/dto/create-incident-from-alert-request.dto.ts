import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentFromAlertRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  operatorNote?: string;

  @ApiPropertyOptional({ enum: ['HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsIn(['HIGH', 'CRITICAL'])
  severityOverride?: 'HIGH' | 'CRITICAL';
}
