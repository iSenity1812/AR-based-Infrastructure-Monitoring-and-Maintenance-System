import { AccessTokenIssuerPort } from '../../domain/ports/access-token-issuer.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RefreshTokenGeneratorPort } from '../../domain/ports/refresh-token-generator.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { SessionRepositoryPort } from '../../domain/ports/session-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import type { TokenPairDto } from '../dto/token-pair.dto';
import { IdentityPermissionService } from '../services/identity-permission.service';
import {
  ForbiddenUseCaseError,
  UnauthorizedUseCaseError,
} from '../errors/use-case.errors';

export interface RefreshSessionCommand {
  sessionId: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort,
    private readonly refreshTokenGenerator: RefreshTokenGeneratorPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<TokenPairDto> {
    const session = await this.sessionRepository.findById(command.sessionId);

    if (!session || !session.isActive(new Date())) {
      throw new UnauthorizedUseCaseError('Session is no longer valid.');
    }

    const isTokenValid = await this.passwordHasher.compare(
      command.refreshToken,
      session.refreshTokenHash,
    );

    if (!isTokenValid) {
      throw new UnauthorizedUseCaseError('Refresh token is invalid.');
    }

    const user = await this.userRepository.findById(session.userId);

    if (!user) {
      throw new UnauthorizedUseCaseError('User not found for session.');
    }

    if (!user.canLogin()) {
      throw new ForbiddenUseCaseError('User is not active.');
    }

    const roles = await this.roleRepository.findByCodes(user.roleCodes);
    const permissions =
      this.identityPermissionService.resolvePermissions(roles);
    const nextRefreshToken = this.refreshTokenGenerator.generate();
    const nextRefreshTokenHash = await this.passwordHasher.hash(
      nextRefreshToken,
    );

    await this.sessionRepository.updateRefreshToken(
      session.id,
      nextRefreshTokenHash,
      command.refreshTokenExpiresAt,
    );

    const accessToken = await this.accessTokenIssuer.issue({
      userId: user.id,
      username: user.username,
      sessionId: session.id,
      roles: user.roleCodes,
      permissions,
      mustChangePassword: user.mustChangePassword,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      sessionId: session.id,
    };
  }
}
