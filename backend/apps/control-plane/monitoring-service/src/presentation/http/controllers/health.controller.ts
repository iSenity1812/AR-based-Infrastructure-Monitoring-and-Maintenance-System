import { Controller, Get, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Connection } from 'mongoose';

import { Public } from '../../../adapters/inbound/http/decorators/public.decorator';
import { MonitoringServiceConfig } from '../../../infrastructure/config/monitoring-service-config';
import {
  HealthResponseDto,
  HealthResponseEnvelopeDto,
} from '../dto/health-response.dto';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: MonitoringServiceConfig,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the monitoring service is alive.' })
  @ApiOkResponse({ type: HealthResponseEnvelopeDto })
  getLiveHealth(): HealthResponseDto {
    return this.buildHealthResponse([
      {
        name: 'app',
        status: 'ok',
        details: {
          nodeEnv: this.config.nodeEnv,
        },
      },
    ]);
  }

  @Get()
  @ApiOperation({
    summary: 'Check service readiness and MongoDB connectivity.',
  })
  @ApiOkResponse({ type: HealthResponseEnvelopeDto })
  async getHealth(): Promise<HealthResponseDto> {
    const mongoCheck = await this.checkMongoHealth();
    return this.buildHealthResponse([
      {
        name: 'app',
        status: 'ok',
        details: {
          nodeEnv: this.config.nodeEnv,
          port: this.config.port,
        },
      },
      mongoCheck,
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the monitoring service is ready.' })
  @ApiOkResponse({ type: HealthResponseEnvelopeDto })
  async getReadiness(): Promise<HealthResponseDto> {
    const mongoCheck = await this.checkMongoHealth();
    return this.buildHealthResponse([
      {
        name: 'app',
        status: 'ok',
        details: {
          nodeEnv: this.config.nodeEnv,
          port: this.config.port,
        },
      },
      mongoCheck,
    ]);
  }

  private buildHealthResponse(
    checks: HealthResponseDto['checks'],
  ): HealthResponseDto {
    const status = checks.some((check) => check.status !== 'ok')
      ? 'degraded'
      : 'ok';

    return {
      service: 'monitoring-service',
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      checks,
    };
  }

  private async checkMongoHealth(): Promise<
    HealthResponseDto['checks'][number]
  > {
    try {
      if (this.connection.readyState !== 1) {
        return {
          name: 'mongo',
          status: 'degraded',
          details: {
            readyState: this.connection.readyState,
            state: this.describeMongoState(this.connection.readyState),
          },
        };
      }

      await this.connection.db?.admin().ping();

      return {
        name: 'mongo',
        status: 'ok',
        details: {
          readyState: this.connection.readyState,
          state: this.describeMongoState(this.connection.readyState),
          host: this.connection.host,
          name: this.connection.name,
        },
      };
    } catch (error) {
      this.logger.error(
        'MongoDB health check failed',
        error instanceof Error ? error.stack : undefined,
        HealthController.name,
      );

      return {
        name: 'mongo',
        status: 'degraded',
        details: {
          readyState: this.connection.readyState,
          state: this.describeMongoState(this.connection.readyState),
        },
      };
    }
  }

  private describeMongoState(readyState: number): string {
    switch (readyState) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }
}
