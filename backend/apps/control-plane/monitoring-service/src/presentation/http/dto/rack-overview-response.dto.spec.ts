import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { RackOverviewQueryDto } from './rack-overview-response.dto';

describe('RackOverviewQueryDto', () => {
  it('accepts supported query params under whitelist validation', () => {
    const dto = plainToInstance(RackOverviewQueryDto, {
      severity: 'critical,high',
      onlySignalLoss: 'true',
      onlyFailure: 'false',
      search: 'LOCAL-LAB',
      sortBy: 'severity',
      sortOrder: 'desc',
      page: '1',
      limit: '50',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    });

    expect(errors).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(50);
  });
});
