import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { CreateIncidentRequestDto } from './create-incident-request.dto';

function buildValidPayload() {
  return {
    incidentCode: 'INC-001',
    title: 'Node stale',
    severity: IncidentSeverity.CRITICAL,
    capturedSnapshot: {
      schemaVersion: 'incident.context.v1',
      capturedAt: '2026-07-23T04:18:45.000Z',
      window: {
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
        interval: '1m',
      },
      completeness: 'partial',
      unavailableSources: [
        {
          source: 'asset-service',
          reasonCode: 'TIMEOUT',
        },
      ],
      alert: {
        fingerprint: 'fp-1',
      },
      scope: {
        scopeType: 'node',
        scopeId: 'node-1',
      },
    },
  };
}

describe('CreateIncidentRequestDto', () => {
  it('accepts a partial captured snapshot', () => {
    const dto = plainToInstance(CreateIncidentRequestDto, buildValidPayload());

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid captured snapshot schema version', () => {
    const dto = plainToInstance(CreateIncidentRequestDto, {
      ...buildValidPayload(),
      capturedSnapshot: {
        ...buildValidPayload().capturedSnapshot,
        schemaVersion: 'incident.context.v2',
      },
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).not.toHaveLength(0);
    expect(JSON.stringify(errors)).toContain('schemaVersion');
  });

  it('rejects malformed captured snapshot timestamps', () => {
    const dto = plainToInstance(CreateIncidentRequestDto, {
      ...buildValidPayload(),
      capturedSnapshot: {
        ...buildValidPayload().capturedSnapshot,
        capturedAt: 'not-a-date',
      },
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).not.toHaveLength(0);
    expect(JSON.stringify(errors)).toContain('capturedAt');
  });
});
