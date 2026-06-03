import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { RoleCode } from '../../domain/constants/role-code.enum';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { IdentityPermissionService } from '../services/identity-permission.service';
import { ConflictUseCaseError } from '../errors/use-case.errors';

export interface CreateUserCommand {
  username: string;
  email: string;
  password: string;
  roleCodes: RoleCode[];
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(command: CreateUserCommand): Promise<AuthenticatedUserDto> {
    const exists = await this.userRepository.existsByUsernameOrEmail(
      command.username,
      command.email.toLowerCase(),
    );

    if (exists) {
      throw new ConflictUseCaseError('Username or email already exists.');
    }

    const roles = await this.roleRepository.findByCodes(command.roleCodes);

    if (roles.length !== command.roleCodes.length) {
      throw new ConflictUseCaseError('One or more role codes are invalid.');
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = await this.userRepository.create({
      username: command.username,
      email: command.email.toLowerCase(),
      passwordHash,
      roleCodes: command.roleCodes,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      roleCodes: user.roleCodes,
      permissions: this.identityPermissionService.resolvePermissions(roles),
    };
  }
}
