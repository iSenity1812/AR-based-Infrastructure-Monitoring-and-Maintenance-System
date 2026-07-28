import { MonitoringWorkflowSystemAuthService } from './monitoring-workflow-system-auth.service';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

describe('MonitoringWorkflowSystemAuthService', () => {
  it('includes asset health read permission in the system token payload', async () => {
    const signAsync = jest.fn().mockResolvedValue('signed-token');
    const service = new MonitoringWorkflowSystemAuthService(
      {
        signAsync,
      } as never,
      new MonitoringServiceConfig({}),
    );

    await expect(service.createSystemAuthContext()).resolves.toEqual(
      expect.objectContaining({
        authorizationHeader: 'Bearer signed-token',
        actor: expect.objectContaining({
          userId: 'system-monitoring-service',
        }),
      }),
    );

    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: expect.arrayContaining(['assets.health.read']),
      }),
      expect.any(Object),
    );
  });
});
