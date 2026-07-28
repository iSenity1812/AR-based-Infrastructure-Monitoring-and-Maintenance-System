import { RoleCode } from '../../domain/constants/role-code.enum';
import { UserStatus } from '../../domain/constants/user-status.enum';
import { buildSystemRoles } from '../../domain/policies/system-role.policy';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';

export interface SeedIdentityCommand {
  users: Array<{
    username: string;
    email: string;
    password: string;
    roleCodes: RoleCode[];
    fullName: string;
  }>;
}

type SeedUserInput = {
  username: string;
  email: string;
  password: string;
  roleCodes: RoleCode[];
  fullName: string;
};

export class SeedIdentityUseCase {
  constructor(
    private readonly roleRepository: RoleRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: SeedIdentityCommand): Promise<void> {
    await this.roleRepository.upsertSystemRoles(buildSystemRoles());

    for (const user of command.users) {
      await this.seedUser(user);
    }
  }

  private async seedUser(input: SeedUserInput): Promise<void> {
    const exists = await this.userRepository.existsByUsernameOrEmail(
      input.username,
      input.email.toLowerCase(),
    );
    const passwordChangedAt = new Date();

    if (exists) {
      const existingUser = await this.userRepository.findByEmail(
        input.email.toLowerCase(),
      );

      if (!existingUser) {
        return;
      }

      await this.userRepository.updateStatus(
        existingUser.id,
        UserStatus.ACTIVE,
      );
      await this.userRepository.updateRoles(existingUser.id, input.roleCodes);
      await this.userRepository.updatePassword(
        existingUser.id,
        await this.passwordHasher.hash(input.password),
        passwordChangedAt,
      );
      return;
    }

    await this.userRepository.create({
      username: input.username,
      email: input.email.toLowerCase(),
      passwordHash: await this.passwordHasher.hash(input.password),
      roleCodes: input.roleCodes,
      fullName: input.fullName,
      mustChangePassword: false,
      passwordChangedAt,
    });
  }
}
