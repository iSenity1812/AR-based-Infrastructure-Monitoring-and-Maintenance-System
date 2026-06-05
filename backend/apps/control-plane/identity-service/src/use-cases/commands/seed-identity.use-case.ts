import { RoleCode } from '../../domain/constants/role-code.enum';
import { buildSystemRoles } from '../../domain/policies/system-role.policy';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';

export interface SeedIdentityCommand {
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

export class SeedIdentityUseCase {
  constructor(
    private readonly roleRepository: RoleRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: SeedIdentityCommand): Promise<void> {
    await this.roleRepository.upsertSystemRoles(buildSystemRoles());

    const exists = await this.userRepository.existsByUsernameOrEmail(
      command.adminUsername,
      command.adminEmail.toLowerCase(),
    );

    if (exists) {
      return;
    }

    await this.userRepository.create({
      username: command.adminUsername,
      email: command.adminEmail.toLowerCase(),
      passwordHash: await this.passwordHasher.hash(command.adminPassword),
      roleCodes: [RoleCode.IT_ADMINISTRATOR],
    });
  }
}
