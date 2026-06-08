import { randomBytes, randomUUID } from 'crypto';

import { RoleCode } from '../../domain/constants/role-code.enum';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import { UserOnboardingNotificationPort } from '../../domain/ports/user-onboarding-notification.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import type { CreateUserResultDto } from '../dto/create-user-result.dto';
import { toAuthenticatedUserDto } from '../dto/user-view.mapper';
import { IdentityPermissionService } from '../services/identity-permission.service';
import { ConflictUseCaseError } from '../errors/use-case.errors';

export interface CreateUserCommand {
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  roleCodes: RoleCode[];
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly identityPermissionService: IdentityPermissionService,
    private readonly userOnboardingNotification: UserOnboardingNotificationPort,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResultDto> {
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

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await this.passwordHasher.hash(temporaryPassword);
    const user = await this.userRepository.create({
      username: command.username,
      email: command.email.toLowerCase(),
      passwordHash,
      roleCodes: command.roleCodes,
      fullName: command.fullName,
      phoneNumber: command.phoneNumber,
      jobTitle: command.jobTitle,
      department: command.department,
      avatarUrl: command.avatarUrl,
      mustChangePassword: true,
    });

    const permissions =
      this.identityPermissionService.resolvePermissions(roles);

    await this.userOnboardingNotification.publishUserOnboarded({
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      topic: 'identity.user.onboarded',
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      temporaryPassword,
      mustChangePassword: user.mustChangePassword,
    });

    return {
      user: toAuthenticatedUserDto(user, permissions),
      temporaryPassword,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private generateTemporaryPassword(): string {
    return `Tmp!${randomBytes(8).toString('base64url')}`;
  }
}
