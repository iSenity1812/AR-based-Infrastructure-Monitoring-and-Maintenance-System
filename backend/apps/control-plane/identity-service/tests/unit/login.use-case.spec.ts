import { RoleCode } from '../../src/domain/constants/role-code.enum';
import { UserStatus } from '../../src/domain/constants/user-status.enum';
import { IdentityUser } from '../../src/domain/entities/identity-user.entity';
import { LoginUseCase } from '../../src/use-cases/commands/login.use-case';
import { ForbiddenUseCaseError } from '../../src/use-cases/errors/use-case.errors';
import { IdentityPermissionService } from '../../src/use-cases/services/identity-permission.service';

describe('LoginUseCase', () => {
  it('should reject locked users', async () => {
    const useCase = new LoginUseCase(
      {
        findByEmail: jest.fn().mockResolvedValue(
          new IdentityUser({
            id: 'user-1',
            username: 'locked-user',
            email: 'locked@example.com',
            passwordHash: 'hash',
            status: UserStatus.LOCKED,
            roleCodes: [RoleCode.IT_ADMINISTRATOR],
            fullName: 'Locked User',
            mustChangePassword: false,
          }),
        ),
        findById: jest.fn(),
        findAll: jest.fn(),
        findMany: jest.fn(),
        existsByUsernameOrEmail: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        updateRoles: jest.fn(),
        updatePassword: jest.fn(),
        markLastLogin: jest.fn(),
        searchByUsername: jest.fn(),
      },
      {
        findByCodes: jest.fn(),
        findAll: jest.fn(),
        upsertSystemRoles: jest.fn(),
      },
      {
        create: jest.fn(),
        findById: jest.fn(),
        updateRefreshToken: jest.fn(),
        revoke: jest.fn(),
        revokeAllForUser: jest.fn(),
      },
      {
        compare: jest.fn(),
        hash: jest.fn(),
      },
      {
        issue: jest.fn(),
      },
      {
        generate: jest.fn(),
      },
      new IdentityPermissionService(),
    );

    await expect(
      useCase.execute({
        email: 'locked@example.com',
        password: 'password123',
        refreshTokenExpiresAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenUseCaseError);
  });
});
