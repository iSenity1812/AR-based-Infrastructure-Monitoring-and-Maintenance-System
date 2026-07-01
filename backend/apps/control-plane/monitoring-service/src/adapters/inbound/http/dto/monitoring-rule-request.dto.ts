import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlertSeverity } from '../../../../domain/constants/alert-severity.enum';
import { MonitoringScopeType } from '../../../../domain/constants/monitoring-scope-type.enum';
import { RuleEvaluationMode } from '../../../../domain/constants/rule-evaluation-mode.enum';
import { RuleOperator } from '../../../../domain/constants/rule-operator.enum';

export class CreateMonitoringRuleRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MonitoringScopeType)
  scopeType!: MonitoringScopeType;

  @IsString()
  @IsNotEmpty()
  metricKey!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contextMetricKey?: string;

  @IsEnum(RuleOperator)
  operator!: RuleOperator;

  @IsOptional()
  thresholdValue?: number | string | boolean;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsBoolean()
  enabled!: boolean;

  @IsEnum(RuleEvaluationMode)
  evaluationMode!: RuleEvaluationMode;
}

export class UpdateMonitoringRuleRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  thresholdValue?: number | string | boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contextMetricKey?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
