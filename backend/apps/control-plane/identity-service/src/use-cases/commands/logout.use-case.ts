import { SessionRepositoryPort } from '../../domain/ports/session-repository.port';

export class LogoutUseCase {
  constructor(private readonly sessionRepository: SessionRepositoryPort) {}

  async execute(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId, new Date());
  }
}
