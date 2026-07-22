import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { AlertIncidentHandoffController } from './alert-incident-handoff.controller';

describe('AlertIncidentHandoffController', () => {
  it('declares incident create permission on the handoff endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      AlertIncidentHandoffController.prototype.createIncidentFromAlert,
    );

    expect(permissions).toEqual([PERMISSION_CODES.INCIDENTS_CREATE]);
  });

  it('delegates handoff creation with actor context from authenticated request', async () => {
    const execute = jest.fn().mockResolvedValue({
      fingerprint: 'fp-node-a1',
      action: 'created',
      triageStatus: 'incident_created',
      alert: {},
      incident: {},
    });
    const controller = new AlertIncidentHandoffController({ execute } as never);

    await controller.createIncidentFromAlert(
      'fp-node-a1',
      {
        operatorNote: 'Escalate manually',
        severityOverride: 'CRITICAL',
      },
      'Bearer token',
      {
        userId: 'user-1',
        username: 'ducpv',
        fullName: 'Pham Van Duc',
        sessionId: 'session-1',
        roles: [],
        permissions: [],
        mustChangePassword: false,
      },
      {
        headers: {
          'x-correlation-id': 'corr-1',
        },
      } as never,
    );

    expect(execute).toHaveBeenCalledWith({
      fingerprint: 'fp-node-a1',
      authorizationHeader: 'Bearer token',
      correlationId: 'corr-1',
      actor: {
        userId: 'user-1',
        username: 'ducpv',
        sessionId: 'session-1',
        fullName: 'Pham Van Duc',
      },
      title: undefined,
      description: undefined,
      operatorNote: 'Escalate manually',
      severityOverride: 'CRITICAL',
    });
  });
});
