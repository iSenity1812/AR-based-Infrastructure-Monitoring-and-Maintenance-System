import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { RackMonitoringStateController } from './rack-monitoring-state.controller';

describe('RackMonitoringStateController', () => {
  it('declares dashboard read permission on the rack monitoring state endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      RackMonitoringStateController.prototype.getRackMonitoringState,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('declares dashboard read permission on the manual rack poll endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      RackMonitoringStateController.prototype.pollRackMonitoring,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates rack monitoring state generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      generatedAt: '2026-07-08T10:00:00.000Z',
      scope: 'rack',
      view: 'monitoring_state',
      items: [],
    });
    const controller = new RackMonitoringStateController({
      execute,
    } as never);

    await expect(controller.getRackMonitoringState()).resolves.toEqual({
      generatedAt: '2026-07-08T10:00:00.000Z',
      scope: 'rack',
      view: 'monitoring_state',
      items: [],
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('delegates manual poll execution and returns a debug-friendly poll summary', async () => {
    const getRackMonitoringStateExecute = jest.fn();
    const pollRackMonitoringExecute = jest.fn().mockResolvedValue({
      transitions: [
        { transitionKind: 'activate', scopeId: 'rack-a1' },
        { transitionKind: 'repeated_active', scopeId: 'rack-a1' },
        { transitionKind: 'noop', scopeId: 'rack-b2' },
        { transitionKind: 'resolve', scopeId: 'rack-c3' },
      ],
      processedRows: 4,
      skippedRows: 1,
      nextCheckpointSummaryTs: '2026-07-08T16:15:00.000Z',
    });
    const controller = new RackMonitoringStateController(
      {
        execute: getRackMonitoringStateExecute,
      } as never,
      {
        execute: pollRackMonitoringExecute,
      } as never,
    );

    const result = await controller.pollRackMonitoring({
      changedSinceSummaryTs: '2026-07-08T16:05:00.000Z',
    });

    expect(pollRackMonitoringExecute).toHaveBeenCalledWith({
      changedSinceSummaryTs: '2026-07-08T16:05:00.000Z',
    });
    expect(result.scope).toBe('rack');
    expect(result.view).toBe('monitoring_poll');
    expect(result.changedSinceSummaryTs).toBe('2026-07-08T16:05:00.000Z');
    expect(result.processedRows).toBe(4);
    expect(result.skippedRows).toBe(1);
    expect(result.transitionCount).toBe(4);
    expect(result.transitionCounts).toEqual({
      activate: 1,
      resolve: 1,
      repeatedActive: 1,
      noop: 1,
    });
    expect(result.affectedRackIds).toEqual(['rack-a1', 'rack-b2', 'rack-c3']);
    expect(result.nextCheckpointSummaryTs).toBe('2026-07-08T16:15:00.000Z');
  });
});
