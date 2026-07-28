import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { AlertEscalationActorDto } from '../use-cases/dto/alert-escalation-actor.dto';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

export interface MonitoringWorkflowSystemAuthContext {
  authorizationHeader: string;
  actor: AlertEscalationActorDto;
}

@Injectable()
export class MonitoringWorkflowSystemAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: MonitoringServiceConfig,
  ) {}

  async createSystemAuthContext(): Promise<MonitoringWorkflowSystemAuthContext> {
    const payload = {
      userId: this.config.monitoringWorkflowSystemUserId,
      username: this.config.monitoringWorkflowSystemUsername,
      fullName: this.config.monitoringWorkflowSystemFullName,
      sessionId: this.config.monitoringWorkflowSystemSessionId,
      roles: ['SYSTEM_MONITORING_OPERATOR'],
      permissions: [
        'assets.health.read',
        'incidents.create',
        'incidents.read',
        'tickets.create',
        'tickets.read',
      ],
      mustChangePassword: false,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.accessTokenSecret,
      expiresIn: '5m',
    });

    return {
      authorizationHeader: `Bearer ${token}`,
      actor: {
        userId: payload.userId,
        username: payload.username,
        fullName: payload.fullName,
        sessionId: payload.sessionId,
      },
    };
  }
}
