import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  CreateMonitoringRuleRequestDto,
  UpdateMonitoringRuleRequestDto,
} from '../dto/monitoring-rule-request.dto';
import { RegisterMonitoringRuleUseCase } from '../../../../application/use-cases/commands/register-monitoring-rule.use-case';
import { UpdateMonitoringRuleUseCase } from '../../../../application/use-cases/commands/update-monitoring-rule.use-case';
import { Inject } from '@nestjs/common';
import { MONITORING_RULE_REPOSITORY } from '../../../../domain/ports/port.tokens';
import type { MonitoringRuleRepositoryPort } from '../../../../domain/ports/repositories.port';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import { responseMeta } from '../serializers/response-meta';

type HeaderRequest = { headers: Record<string, string | undefined> };

@Controller('monitoring-rules')
export class MonitoringRulesController {
  constructor(
    private readonly registerRule: RegisterMonitoringRuleUseCase,
    private readonly updateRule: UpdateMonitoringRuleUseCase,
    @Inject(MONITORING_RULE_REPOSITORY)
    private readonly ruleRepository: MonitoringRuleRepositoryPort,
  ) {}

  @Post()
  async create(
    @Body() body: CreateMonitoringRuleRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.registerRule.execute(body),
      responseMeta(request),
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMonitoringRuleRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.updateRule.execute({
        id,
        ...body,
      }),
      responseMeta(request),
    );
  }

  @Get()
  async list(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.ruleRepository.listAll(),
      responseMeta(request),
    );
  }
}
