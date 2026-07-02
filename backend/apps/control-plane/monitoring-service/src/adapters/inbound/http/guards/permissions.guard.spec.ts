import { Reflector } from '@nestjs/core';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';

import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_CODES } from '../constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

describe('PermissionsGuard', () => {
  const createContext = (user?: { permissions: string[] }) =>
    ({
      getHandler: jest.fn().mockReturnValue(function handler() {}),
      getClass: jest.fn().mockReturnValue(function controller() {}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as never;

  it('allows access when no permission metadata is declared', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRED_PERMISSIONS_KEY,
      [expect.any(Function), expect.any(Function)],
    );
  });

  it('allows access when the caller owns the required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([
        PERMISSION_CODES.DASHBOARD_READ,
      ]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    const result = guard.canActivate(
      createContext({ permissions: [PERMISSION_CODES.DASHBOARD_READ] }),
    );

    expect(result).toBe(true);
  });

  it('rejects requests without hydrated auth context', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([
        PERMISSION_CODES.DASHBOARD_READ,
      ]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createContext())).toThrow(
      ProblemDetailException,
    );
  });

  it('rejects callers that only have the right role but not the required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([
        PERMISSION_CODES.DASHBOARD_READ,
      ]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() =>
      guard.canActivate(
        createContext({
          permissions: [],
        }),
      ),
    ).toThrow(ProblemDetailException);
  });
});
