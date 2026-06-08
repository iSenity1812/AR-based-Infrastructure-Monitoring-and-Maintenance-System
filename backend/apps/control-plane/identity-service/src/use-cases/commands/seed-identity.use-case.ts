import { RoleCode } from '../../domain/constants/role-code.enum';
import { buildSystemRoles } from '../../domain/policies/system-role.policy';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';

export interface SeedIdentityCommand {
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  operatorUsername: string;
  operatorEmail: string;
  operatorPassword: string;
  technicianUsername: string;
  technicianEmail: string;
  technicianPassword: string;
}

export class SeedIdentityUseCase {
  constructor(
    private readonly roleRepository: RoleRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: SeedIdentityCommand): Promise<void> {
    await this.roleRepository.upsertSystemRoles(buildSystemRoles());

    await this.seedUser({
      username: command.adminUsername,
      email: command.adminEmail,
      password: command.adminPassword,
      roleCodes: [RoleCode.IT_ADMINISTRATOR],
      fullName: 'System Administrator',
    });

    await this.seedUser({
      username: command.operatorUsername,
      email: command.operatorEmail,
      password: command.operatorPassword,
      roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
      fullName: 'Monitoring Operator',
    });

    await this.seedUser({
      username: command.technicianUsername,
      email: command.technicianEmail,
      password: command.technicianPassword,
      roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
      fullName: 'Maintenance Technician',
    });
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
