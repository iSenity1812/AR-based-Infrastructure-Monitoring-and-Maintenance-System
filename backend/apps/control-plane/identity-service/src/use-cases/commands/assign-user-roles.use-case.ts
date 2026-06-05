import { RoleCode } from '../../domain/constants/role-code.enum';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { IdentityPermissionService } from '../services/identity-permission.service';
import {
  ConflictUseCaseError,
  NotFoundUseCaseError,
} from '../errors/use-case.errors';

export class AssignUserRolesUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(
    userId: string,
    roleCodes: RoleCode[],
  ): Promise<AuthenticatedUserDto> {
    const roles = await this.roleRepository.findByCodes(roleCodes);

    if (roles.length !== roleCodes.length) {
      throw new ConflictUseCaseError('One or more role codes are invalid.');
    }

    const user = await this.userRepository.updateRoles(userId, roleCodes);

    if (!user) {
      throw new NotFoundUseCaseError('User not found.');
    }

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
