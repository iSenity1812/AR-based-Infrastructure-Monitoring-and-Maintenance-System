import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import type { CurrentAuthContextDto } from '../dto/current-auth-context.dto';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { IdentityPermissionService } from '../services/identity-permission.service';
import { UnauthorizedUseCaseError } from '../errors/use-case.errors';

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(context: CurrentAuthContextDto): Promise<AuthenticatedUserDto> {
    const user = await this.userRepository.findById(context.userId);

    if (!user) {
      throw new UnauthorizedUseCaseError('User not found.');
    }

    const roles = await this.roleRepository.findByCodes(user.roleCodes);

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
