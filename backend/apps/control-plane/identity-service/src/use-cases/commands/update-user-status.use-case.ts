import { UserStatus } from '../../domain/constants/user-status.enum';
import { SessionRepositoryPort } from '../../domain/ports/session-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { toAuthenticatedUserDto } from '../dto/user-view.mapper';
import { IdentityPermissionService } from '../services/identity-permission.service';
import { NotFoundUseCaseError } from '../errors/use-case.errors';

export class UpdateUserStatusUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(
    userId: string,
    status: UserStatus,
  ): Promise<AuthenticatedUserDto> {
    const user = await this.userRepository.updateStatus(userId, status);

    if (!user) {
      throw new NotFoundUseCaseError('User not found.');
    }

    if (status === UserStatus.LOCKED) {
      await this.sessionRepository.revokeAllForUser(userId, new Date());
    }

    const roles = await this.roleRepository.findByCodes(user.roleCodes);

    return toAuthenticatedUserDto(
      user,
      this.identityPermissionService.resolvePermissions(roles),
    );
  }
}
