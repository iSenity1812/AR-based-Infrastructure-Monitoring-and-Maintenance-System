export interface UserOnboardedNotificationEvent {
  eventId: string;
  occurredAt: string;
  topic: 'identity.user.onboarded';
  userId: string;
  username: string;
  email: string;
  fullName: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export interface UserOnboardingNotificationPort {
  publishUserOnboarded(
    event: UserOnboardedNotificationEvent,
  ): Promise<void>;
}
