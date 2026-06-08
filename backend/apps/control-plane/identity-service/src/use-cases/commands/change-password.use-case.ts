import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { SessionRepositoryPort } from '../../domain/ports/session-repository.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import type { CurrentAuthContextDto } from '../dto/current-auth-context.dto';
import {
  ConflictUseCaseError,
  UnauthorizedUseCaseError,
} from '../errors/use-case.errors';

export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    context: CurrentAuthContextDto,
    command: ChangePasswordCommand,
  ): Promise<void> {
    const user = await this.userRepository.findById(context.userId);

    if (!user) {
      throw new UnauthorizedUseCaseError('User not found.');
    }

    const isCurrentPasswordValid = await this.passwordHasher.compare(
      command.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedUseCaseError('Current password is invalid.');
    }

    if (command.currentPassword === command.newPassword) {
      throw new ConflictUseCaseError(
        'New password must be different from the current password.',
      );
    }

    const changedAt = new Date();
    const nextPasswordHash = await this.passwordHasher.hash(command.newPassword);
    const updatedUser = await this.userRepository.updatePassword(
      user.id,
      nextPasswordHash,
      changedAt,
    );

    if (!updatedUser) {
      throw new UnauthorizedUseCaseError('User not found.');
    }

    await this.sessionRepository.revokeAllForUser(user.id, changedAt);
  }
}
