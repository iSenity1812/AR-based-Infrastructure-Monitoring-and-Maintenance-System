import { Injectable } from '@nestjs/common';
import {
  MonitoringContextInput,
  MonitoringContextInputProps,
  MonitoringSnapshotInput,
  MonitoringSnapshotInputProps,
} from '../../../../domain/entities/monitoring-input.entity';
import {
  MonitoringContextRepositoryPort,
  MonitoringSnapshotRepositoryPort,
} from '../../../../domain/ports/repositories.port';
import { MonitoringScopeType } from '../../../../domain/constants/monitoring-scope-type.enum';

@Injectable()
export class InMemoryMonitoringContextRepository implements MonitoringContextRepositoryPort {
  private readonly items = new Map<string, MonitoringContextInput>();

  upsert(input: MonitoringContextInputProps): Promise<MonitoringContextInput> {
    const entity = new MonitoringContextInput(input);
    this.items.set(this.toKey(entity.scopeType, entity.scopeId), entity);
    return Promise.resolve(entity);
  }

  findByScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
  ): Promise<MonitoringContextInput | null> {
    return Promise.resolve(
      this.items.get(this.toKey(scopeType, scopeId)) ?? null,
    );
  }

  listByScopeType(
    scopeType: MonitoringScopeType,
  ): Promise<MonitoringContextInput[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.scopeType === scopeType),
    );
  }

  private toKey(scopeType: MonitoringScopeType, scopeId: string): string {
    return `${scopeType}|${scopeId}`;
  }
}

@Injectable()
export class InMemoryMonitoringSnapshotRepository implements MonitoringSnapshotRepositoryPort {
  private readonly items = new Map<string, MonitoringSnapshotInput>();

  upsert(
    input: MonitoringSnapshotInputProps,
  ): Promise<MonitoringSnapshotInput> {
    const entity = new MonitoringSnapshotInput(input);
    this.items.set(this.toKey(entity.scopeType, entity.scopeId), entity);
    return Promise.resolve(entity);
  }

  findByScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
  ): Promise<MonitoringSnapshotInput | null> {
    return Promise.resolve(
      this.items.get(this.toKey(scopeType, scopeId)) ?? null,
    );
  }

  listByScopeType(
    scopeType: MonitoringScopeType,
  ): Promise<MonitoringSnapshotInput[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.scopeType === scopeType),
    );
  }

  private toKey(scopeType: MonitoringScopeType, scopeId: string): string {
    return `${scopeType}|${scopeId}`;
  }
}
