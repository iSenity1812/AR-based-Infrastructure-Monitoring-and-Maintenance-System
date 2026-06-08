import { Injectable, Logger } from '@nestjs/common';

import {
  UserOnboardedNotificationEvent,
  UserOnboardingNotificationPort,
} from '../../domain/ports/user-onboarding-notification.port';

@Injectable()
export class LoggingUserOnboardingNotificationAdapter
  implements UserOnboardingNotificationPort
{
  private readonly logger = new Logger(
    LoggingUserOnboardingNotificationAdapter.name,
  );

  async publishUserOnboarded(
    event: UserOnboardedNotificationEvent,
  ): Promise<void> {
    this.logger.log(
      `Queued onboarding event for Redpanda topic ${event.topic} and user ${event.userId}.`,
    );
  }
}
