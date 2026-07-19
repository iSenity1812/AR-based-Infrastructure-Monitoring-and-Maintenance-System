import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { RackOverviewController } from './rack-overview.controller';

describe('RackOverviewController', () => {
  it('declares dashboard read permission on the rack overview endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      RackOverviewController.prototype.getRackOverview,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates overview payload generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      generatedAt: '2026-07-19T11:02:54.220Z',
      scope: 'rack',
      view: 'operator_dashboard',
      globalCounters: {
        totalRacks: 0,
        criticalCount: 0,
        highCount: 0,
        warningCount: 0,
        staleCount: 0,
        healthyCount: 0,
        globalRackLevelFailures: 0,
      },
      racks: [],
      paginationAndSort: {
        currentPage: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
        currentSortBy: 'severity',
        currentSortOrder: 'desc',
        activeFilters: {
          severity: ['critical', 'high', 'warning', 'stale', 'healthy'],
          onlyFailure: false,
          onlySignalLoss: false,
          search: '',
        },
      },
    });
    const controller = new RackOverviewController({ execute } as never);

    await expect(
      controller.getRackOverview({
        severity: 'critical,high',
        onlyFailure: 'true' as never,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        generatedAt: '2026-07-19T11:02:54.220Z',
        racks: [],
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      severity: 'critical,high',
      onlyFailure: 'true',
    });
  });
});
