export interface CurrentAuthContextDto {
  userId: string;
  username: string;
  fullName?: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}
