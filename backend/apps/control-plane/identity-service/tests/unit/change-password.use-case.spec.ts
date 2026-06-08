import { RoleCode } from '../../src/domain/constants/role-code.enum';
import { UserStatus } from '../../src/domain/constants/user-status.enum';
import { IdentityUser } from '../../src/domain/entities/identity-user.entity';
import { ChangePasswordUseCase } from '../../src/use-cases/commands/change-password.use-case';

describe('ChangePasswordUseCase', () => {
  it('should update password, clear onboarding flag, and revoke all sessions', async () => {
    const updatePassword = jest.fn().mockResolvedValue(
      new IdentityUser({
        id: 'user-1',
        username: 'operator01',
        email: 'operator01@example.com',
        passwordHash: 'new-hash',
        status: UserStatus.ACTIVE,
        roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
        fullName: 'Operator One',
        mustChangePassword: false,
        passwordChangedAt: new Date('2026-06-07T10:15:00.000Z'),
      }),
    );
    const revokeAllForUser = jest.fn().mockResolvedValue(undefined);

    const useCase = new ChangePasswordUseCase(
      {
        findById: jest.fn().mockResolvedValue(
          new IdentityUser({
            id: 'user-1',
            username: 'operator01',
            email: 'operator01@example.com',
            passwordHash: 'old-hash',
            status: UserStatus.ACTIVE,
            roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
            fullName: 'Operator One',
            mustChangePassword: true,
          }),
        ),
        findAll: jest.fn(),
        findMany: jest.fn(),
        findByEmail: jest.fn(),
        existsByUsernameOrEmail: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        updateRoles: jest.fn(),
        updatePassword,
        markLastLogin: jest.fn(),
        searchByUsername: jest.fn(),
      },
      {
        create: jest.fn(),
        findById: jest.fn(),
        updateRefreshToken: jest.fn(),
        revoke: jest.fn(),
        revokeAllForUser,
      },
      {
        compare: jest.fn().mockResolvedValue(true),
        hash: jest.fn().mockResolvedValue('new-hash'),
      },
    );

    await useCase.execute(
      {
        userId: 'user-1',
        username: 'operator01',
        sessionId: 'session-1',
        roles: [RoleCode.SYSTEM_MONITORING_OPERATOR],
        permissions: [],
        mustChangePassword: true,
      },
      {
        currentPassword: 'TempPass@123',
        newPassword: 'NewStrongPass@123',
      },
    );

    expect(updatePassword).toHaveBeenCalledWith(
      'user-1',
      'new-hash',
      expect.any(Date),
    );
    expect(revokeAllForUser).toHaveBeenCalledWith('user-1', expect.any(Date));
  });
});
