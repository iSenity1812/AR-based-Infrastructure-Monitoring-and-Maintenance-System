import { Injectable } from '@nestjs/common';
import {
  MonitoringAlert,
  MonitoringAlertProps,
} from '../../../../domain/entities/monitoring-alert.entity';
import { AlertRepositoryPort } from '../../../../domain/ports/repositories.port';

@Injectable()
export class InMemoryAlertRepository implements AlertRepositoryPort {
  private readonly items = new Map<string, MonitoringAlert>();

  create(input: MonitoringAlertProps): Promise<MonitoringAlert> {
    const entity = new MonitoringAlert(input);
    this.items.set(entity.id, entity);
    return Promise.resolve(entity);
  }

  update(
    id: string,
    input: Partial<MonitoringAlertProps>,
  ): Promise<MonitoringAlert | null> {
    const existing = this.items.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }

    const updated = new MonitoringAlert({
      ...existing,
      ...input,
      id,
    });
    this.items.set(id, updated);
    return Promise.resolve(updated);
  }

  findById(id: string): Promise<MonitoringAlert | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByFingerprint(fingerprint: string): Promise<MonitoringAlert | null> {
    const matches = [...this.items.values()].filter(
      (item) => item.fingerprint === fingerprint,
    );

    const openMatch = matches.find((item) => item.isOpen());
    if (openMatch) {
      return Promise.resolve(openMatch);
    }

    return Promise.resolve(
      matches.sort(
        (left, right) =>
          (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0),
      )[0] ?? null,
    );
  }

  listOpen(): Promise<MonitoringAlert[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.isOpen()),
    );
  }

  listByScope(
    scopeType: MonitoringAlert['scopeType'],
    scopeId: string,
  ): Promise<MonitoringAlert[]> {
    return Promise.resolve(
      [...this.items.values()].filter(
        (item) => item.scopeType === scopeType && item.scopeId === scopeId,
      ),
    );
  }
}
