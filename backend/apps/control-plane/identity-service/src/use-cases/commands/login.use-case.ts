import { RoleRepositoryPort } from "../../domain/ports/role-repository.port";
import { SessionRepositoryPort } from "../../domain/ports/session-repository.port";
import { UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import { RefreshTokenGeneratorPort } from "../../domain/ports/refresh-token-generator.port";
import { IdentityPermissionService } from "../services/identity-permission.service";
import { toAuthenticatedUserDto } from "../dto/user-view.mapper";
import type { AuthenticatedUserDto } from "../dto/authenticated-user.dto";
import type { TokenPairDto } from "../dto/token-pair.dto";
import {
  ForbiddenUseCaseError,
  UnauthorizedUseCaseError,
} from "../errors/use-case.errors";

export interface LoginCommand {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
  refreshTokenExpiresAt: Date;
}

export interface LoginResult {
  user: AuthenticatedUserDto;
  tokens: TokenPairDto;
  // mustChangePassword: boolean;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort,
    private readonly refreshTokenGenerator: RefreshTokenGeneratorPort,
    private readonly identityPermissionService: IdentityPermissionService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      throw new UnauthorizedUseCaseError("Invalid credentials.");
    }

    if (!user.canLogin()) {
      throw new ForbiddenUseCaseError("User is not allowed to sign in.");
    }

    const isPasswordValid = await this.passwordHasher.compare(
      command.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedUseCaseError("Invalid credentials.");
    }

    const roles = await this.roleRepository.findByCodes(user.roleCodes);
    const permissions =
      this.identityPermissionService.resolvePermissions(roles);
    const loggedInAt = new Date();
    const refreshToken = this.refreshTokenGenerator.generate();
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);
    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt: command.refreshTokenExpiresAt,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
    });
    const updatedUser =
      (await this.userRepository.markLastLogin(user.id, loggedInAt)) ?? user;
    const accessToken = await this.accessTokenIssuer.issue({
      userId: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      sessionId: session.id,
      roles: updatedUser.roleCodes,
      permissions,
      mustChangePassword: updatedUser.mustChangePassword,
    });

    return {
      user: toAuthenticatedUserDto(updatedUser, permissions),
      tokens: {
        accessToken,
        refreshToken,
        sessionId: session.id,
      },
    };
  }
}
