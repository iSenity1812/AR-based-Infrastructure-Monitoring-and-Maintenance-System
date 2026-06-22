import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSION_CODES } from '../../src/domain/constants/permission-code.constant';
import { PermissionsGuard } from '../../src/presentation/http/guards/permissions.guard';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/presentation/http/decorators/require-permissions.decorator';

describe('PermissionsGuard', () => {
  it('allows access when the user has all required permissions', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([PERMISSION_CODES.TICKETS_CREATE]),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            permissions: [PERMISSION_CODES.TICKETS_CREATE],
          },
        }),
      }),
    } as unknown as ExecutionContext;
    const contextMocks = context as unknown as {
      getHandler: jest.Mock;
      getClass: jest.Mock;
    };

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRED_PERMISSIONS_KEY,
      [contextMocks.getHandler(), contextMocks.getClass()],
    );
  });

  it('rejects access when the user misses a required permission', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([PERMISSION_CODES.TICKETS_CREATE]),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            permissions: [],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(
      'Problem Detail Exception',
    );
  });
});
