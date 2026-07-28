import { RoleCode } from '../../src/domain/constants/role-code.enum';
import { UserStatus } from '../../src/domain/constants/user-status.enum';
import { IdentityUser } from '../../src/domain/entities/identity-user.entity';
import { SeedIdentityUseCase } from '../../src/use-cases/commands/seed-identity.use-case';

describe('SeedIdentityUseCase', () => {
  it('reactivates and refreshes existing seeded users', async () => {
    const existingUser = new IdentityUser({
      id: 'user-1',
      username: 'technician01',
      email: 'technician01@example.com',
      passwordHash: 'old-hash',
      status: UserStatus.INACTIVE,
      roleCodes: [RoleCode.IT_ADMINISTRATOR],
      fullName: 'Existing Technician',
      mustChangePassword: false,
    });
    const hash = jest.fn().mockResolvedValue('new-hash');
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const updateRoles = jest.fn().mockResolvedValue(undefined);
    const updatePassword = jest.fn().mockResolvedValue(undefined);

    const useCase = new SeedIdentityUseCase(
      {
        findByCodes: jest.fn(),
        findAll: jest.fn(),
        upsertSystemRoles: jest.fn(),
      },
      {
        findById: jest.fn(),
        findAll: jest.fn(),
        findMany: jest.fn(),
        findByEmail: jest.fn().mockResolvedValue(existingUser),
        existsByUsernameOrEmail: jest.fn().mockResolvedValue(true),
        create: jest.fn(),
        updateStatus,
        updateRoles,
        updatePassword,
        markLastLogin: jest.fn(),
        searchByUsername: jest.fn(),
      },
      {
        hash,
        compare: jest.fn(),
      },
    );

    await useCase.execute({
      users: [
        {
          username: 'technician01',
          email: 'technician01@example.com',
          password: 'Technician01@123456',
          roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
          fullName: 'Do Hoang Nam',
        },
      ],
    });

    expect(updateStatus).toHaveBeenCalledWith('user-1', UserStatus.ACTIVE);
    expect(updateRoles).toHaveBeenCalledWith('user-1', [
      RoleCode.MAINTENANCE_TECHNICIAN,
    ]);
    expect(hash).toHaveBeenCalledWith('Technician01@123456');
    expect(updatePassword).toHaveBeenCalledWith(
      'user-1',
      'new-hash',
      expect.any(Date),
    );
  });
});
