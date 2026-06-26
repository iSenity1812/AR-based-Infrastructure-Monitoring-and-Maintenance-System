import { RoleCode } from '../../domain/constants/role-code.enum';
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

  private async seedUser(input: {
    username: string;
    email: string;
    password: string;
    roleCodes: RoleCode[];
    fullName: string;
  }): Promise<void> {
    const exists = await this.userRepository.existsByUsernameOrEmail(
      input.username,
      input.email.toLowerCase(),
    );

    if (exists) {
      return;
    }

    const passwordChangedAt = new Date();

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
