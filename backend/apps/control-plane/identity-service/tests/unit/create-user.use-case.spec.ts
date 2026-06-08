import { RoleCode } from '../../src/domain/constants/role-code.enum';
import { UserStatus } from '../../src/domain/constants/user-status.enum';
import { IdentityUser } from '../../src/domain/entities/identity-user.entity';
import { CreateUserUseCase } from '../../src/use-cases/commands/create-user.use-case';
import { IdentityPermissionService } from '../../src/use-cases/services/identity-permission.service';

describe('CreateUserUseCase', () => {
  it('should generate a temporary password, require password change, and publish onboarding event', async () => {
    const publishUserOnboarded = jest.fn().mockResolvedValue(undefined);
    const hash = jest.fn().mockResolvedValue('hashed-temp-password');

    const useCase = new CreateUserUseCase(
      {
        findById: jest.fn(),
        findAll: jest.fn(),
        findMany: jest.fn(),
        findByEmail: jest.fn(),
        existsByUsernameOrEmail: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockImplementation(async (input) => {
          expect(input.passwordHash).toBe('hashed-temp-password');
          expect(input.mustChangePassword).toBe(true);
          expect(input.passwordChangedAt).toBeUndefined();

          return new IdentityUser({
            id: 'user-1',
            username: input.username,
            email: input.email,
            passwordHash: input.passwordHash,
            status: UserStatus.ACTIVE,
            roleCodes: input.roleCodes,
            fullName: input.fullName,
            phoneNumber: input.phoneNumber,
            jobTitle: input.jobTitle,
            department: input.department,
            avatarUrl: input.avatarUrl,
            mustChangePassword: input.mustChangePassword,
            createdAt: new Date('2026-06-07T10:00:00.000Z'),
            updatedAt: new Date('2026-06-07T10:00:00.000Z'),
          });
        }),
        updateStatus: jest.fn(),
        updateRoles: jest.fn(),
        updatePassword: jest.fn(),
        markLastLogin: jest.fn(),
        searchByUsername: jest.fn(),
      },
      {
        findByCodes: jest.fn().mockResolvedValue([
          {
            id: 'role-1',
            code: RoleCode.SYSTEM_MONITORING_OPERATOR,
            name: 'System Monitoring Operator',
            description: '',
            permissionCodes: [],
          },
        ]),
        findAll: jest.fn(),
        upsertSystemRoles: jest.fn(),
      },
      {
        hash,
        compare: jest.fn(),
      },
      new IdentityPermissionService(),
      {
        publishUserOnboarded,
      },
    );

    const result = await useCase.execute({
      username: 'operator01',
      email: 'operator01@example.com',
      fullName: 'Operator One',
      phoneNumber: '+84901234567',
      jobTitle: 'Technician',
      department: 'Operations',
      avatarUrl: 'https://example.com/avatar.png',
      roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
    });

    expect(result.temporaryPassword).toMatch(/^Tmp!/);
    expect(result.mustChangePassword).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.user.fullName).toBe('Operator One');
    expect(hash).toHaveBeenCalledWith(result.temporaryPassword);
    expect(publishUserOnboarded).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'identity.user.onboarded',
        userId: 'user-1',
        username: 'operator01',
        email: 'operator01@example.com',
        fullName: 'Operator One',
        temporaryPassword: result.temporaryPassword,
        mustChangePassword: true,
      }),
    );
  });
});
