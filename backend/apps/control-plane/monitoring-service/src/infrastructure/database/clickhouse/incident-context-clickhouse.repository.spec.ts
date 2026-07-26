import {
  IncidentContextClickhouseRepository,
} from './incident-context-clickhouse.repository';

describe('IncidentContextClickhouseRepository', () => {
  it('queries the required node context datasets with bound parameters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => [
          {
            summaryTs: '2026-07-23 04:18:45',
            healthCode: '4',
            operationalSeverityCode: '0',
            signalSeverityCode: '2',
            isAnyStale: '1',
            staleMetricCount: '1',
            warningMetricCount: '0',
            criticalMetricCount: '0',
            worstMetricKey: 'node.heartbeat.loss',
            worstMetricValueNumeric: '0',
            worstMetricValueText: 'PING_TIMEOUT',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            metricKey: 'agent.heartbeat',
            latestTs: '2026-07-23 04:16:44',
            staleAgeSec: '121',
            freshnessCode: '2',
            liveState: 'stale',
            severityCode: '2',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            observedAt: '2026-07-23 04:16:45',
            osProduct: 'Windows 11',
            primaryIpv4: '10.10.10.10',
            macAddress: '00:11:22:33:44:55',
            logicalCpuCount: '16',
            cpuArchitecture: 'x86_64',
            cpuModel: 'AMD Ryzen 7',
            gpuModelPrimary: 'AMD Radeon',
            hardwareSerial: 'SER-001',
            motherboardModel: 'MS-158L',
            ssdModelPrimary: 'Kingston',
            batteryModel: 'BAT-01',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            metricKey: 'cpu_temperature_c_current',
            unit: 'C',
            label: 'CPU Temperature',
            windowMin: '81',
            windowMax: '90.6',
            windowAvg: '84.2',
            lastValueNumeric: '90.6',
            lastValueText: '90.6',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            metricKey: 'agent.heartbeat',
            policyVersion: '1',
            staleAfterSec: '120',
          },
        ],
      });

    const repository = new IncidentContextClickhouseRepository({ query } as never);

    await expect(
      repository.getNodeContext({
        nodeId: 'node-1',
        metricKey: 'cpu_temperature_c_current',
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        currentCondition: expect.objectContaining({
          healthCode: 4,
          isAnyStale: true,
        }),
        heartbeat: expect.objectContaining({
          metricKey: 'agent.heartbeat',
          staleAgeSec: 121,
        }),
        observedHardware: expect.objectContaining({
          logicalCpuCount: 16,
          osProduct: 'Windows 11',
        }),
        metricEvidence: expect.objectContaining({
          metricKey: 'cpu_temperature_c_current',
          lastValueNumeric: 90.6,
        }),
        heartbeatPolicy: expect.objectContaining({
          policyVersion: 1,
          staleAfterSec: 120,
        }),
      }),
    );

    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        query_params: expect.objectContaining({
          nodeId: 'node-1',
          metricKey: 'cpu_temperature_c_current',
          fromTs: '2026-07-23T03:48:45.000Z',
          toTs: '2026-07-23T04:18:45.000Z',
        }),
      }),
    );
  });

  it('returns null or empty subrecords without fabricating zeroes when rows are missing', async () => {
    const query = jest.fn().mockResolvedValue({
      json: async () => [],
    });
    const repository = new IncidentContextClickhouseRepository({ query } as never);

    await expect(
      repository.getNodeContext({
        nodeId: 'node-1',
        metricKey: null,
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
      }),
    ).resolves.toEqual({
      currentCondition: null,
      heartbeat: null,
      observedHardware: null,
      metricEvidence: null,
      heartbeatPolicy: null,
    });
  });

  it('returns node investigation metric series from the requested metric key only', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({
        json: async () => [
          {
            bucketStart: '2026-07-23 04:10:00',
            metricKey: 'cpu_temperature_c_current',
            label: 'CPU Temperature',
            unit: 'C',
            valueNumeric: '88.1',
            valueText: '88.1',
            severityCode: '2',
          },
          {
            bucketStart: '2026-07-23 04:11:00',
            metricKey: 'cpu_temperature_c_current',
            label: 'CPU Temperature',
            unit: 'C',
            valueNumeric: '90.6',
            valueText: '90.6',
            severityCode: '3',
          },
        ],
      });
    const repository = new IncidentContextClickhouseRepository({ query } as never);

    await expect(
      repository.getNodeInvestigation({
        nodeId: 'node-1',
        metricKey: 'cpu_temperature_c_current',
        from: '2026-07-23T04:10:00.000Z',
        to: '2026-07-23T04:11:00.000Z',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        metricSeries: [
          {
            metricKey: 'cpu_temperature_c_current',
            label: 'CPU Temperature',
            unit: 'C',
            points: [
              {
                timestamp: '2026-07-23 04:10:00',
                valueNumeric: 88.1,
                valueText: '88.1',
                severityCode: 2,
              },
              {
                timestamp: '2026-07-23 04:11:00',
                valueNumeric: 90.6,
                valueText: '90.6',
                severityCode: 3,
              },
            ],
          },
        ],
      }),
    );

    expect(query).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        query_params: expect.objectContaining({
          metricKey: 'cpu_temperature_c_current',
        }),
      }),
    );
  });

  it('binds rack bucket granularity explicitly for rack investigation history', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => [
          {
            summaryTs: '2026-07-23 04:12:00',
            rackSeverityCode: '3',
            totalNodes: '10',
            badNodes: '4',
            criticalNodes: '2',
            warningNodes: '2',
            staleNodes: '1',
            silentDeadNodes: '0',
            badNodeRatio: '0.4',
            isRackLevelFailure: '1',
            hasSignalLoss: '1',
            worstNodeId: 'node-9',
            worstMetricKey: 'node.heartbeat.loss',
            worstMetricValueNumeric: '0',
            worstMetricValueText: 'PING_TIMEOUT',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            bucketStart: '2026-07-23 04:05:00',
            summaryTs: '2026-07-23 04:05:58',
            rackSeverityCode: '2',
            totalNodes: '10',
            badNodes: '2',
            criticalNodes: '0',
            warningNodes: '2',
            badNodeRatio: '0.2',
            isRackLevelFailure: '0',
            worstNodeId: 'node-3',
            worstMetricKey: 'memory_used_pct_current',
            worstMetricValueNumeric: '92',
            worstMetricValueText: '92',
          },
        ],
      });
    const repository = new IncidentContextClickhouseRepository({ query } as never);

    await expect(
      repository.getRackInvestigation({
        rackId: 'rack-1',
        from: '2026-07-23T04:00:00.000Z',
        to: '2026-07-23T04:10:00.000Z',
        interval: '5m',
      }),
    ).resolves.toEqual({
      current: {
        summaryTs: '2026-07-23 04:12:00',
        rackSeverityCode: 3,
        totalNodes: 10,
        badNodes: 4,
        criticalNodes: 2,
        warningNodes: 2,
        staleNodes: 1,
        silentDeadNodes: 0,
        badNodeRatio: 0.4,
        isRackLevelFailure: true,
        hasSignalLoss: true,
        worstNodeId: 'node-9',
        worstMetricKey: 'node.heartbeat.loss',
        worstMetricValueNumeric: 0,
        worstMetricValueText: 'PING_TIMEOUT',
      },
      history: [
        {
          bucketStart: '2026-07-23 04:05:00',
          summaryTs: '2026-07-23 04:05:58',
          rackSeverityCode: 2,
          totalNodes: 10,
          badNodes: 2,
          criticalNodes: 0,
          warningNodes: 2,
          badNodeRatio: 0.2,
          isRackLevelFailure: false,
          worstNodeId: 'node-3',
          worstMetricKey: 'memory_used_pct_current',
          worstMetricValueNumeric: 92,
          worstMetricValueText: '92',
        },
      ],
    });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query_params: expect.objectContaining({
          rackId: 'rack-1',
          interval: '5m',
        }),
      }),
    );
  });
});
