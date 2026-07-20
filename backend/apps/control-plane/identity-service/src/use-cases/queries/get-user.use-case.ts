import { RoleRepositoryPort } from "@domain/ports/role-repository.port";
import { UserRepositoryPort } from "@domain/ports/user-repository.port";
import { AuthenticatedUserDto } from "@use-cases/dto/authenticated-user.dto";
import { toAuthenticatedUserDto } from "@use-cases/dto/user-view.mapper";
import { UnauthorizedUseCaseError } from "@use-cases/errors/use-case.errors";
import { IdentityPermissionService } from "@use-cases/services/identity-permission.service";

export class GetUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedUseCaseError("User not found.");
    }

    const roles = await this.roleRepository.findByCodes(user.roleCodes);

    return toAuthenticatedUserDto(
      user,
      this.identityPermissionService.resolvePermissions(roles),
    );
  }
}
