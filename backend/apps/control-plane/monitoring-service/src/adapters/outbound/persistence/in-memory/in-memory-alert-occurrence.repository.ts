import { Injectable } from '@nestjs/common';
import {
  AlertOccurrence,
  AlertOccurrenceProps,
} from '../../../../domain/entities/alert-occurrence.entity';
import { AlertOccurrenceRepositoryPort } from '../../../../domain/ports/repositories.port';

@Injectable()
export class InMemoryAlertOccurrenceRepository implements AlertOccurrenceRepositoryPort {
  private readonly items = new Map<string, AlertOccurrence>();

  create(input: AlertOccurrenceProps): Promise<AlertOccurrence> {
    const entity = new AlertOccurrence(input);
    this.items.set(entity.id, entity);
    return Promise.resolve(entity);
  }

  listByAlertId(alertId: string): Promise<AlertOccurrence[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.alertId === alertId),
    );
  }
}
