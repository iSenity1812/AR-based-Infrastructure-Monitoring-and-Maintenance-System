export interface CurrentAuthContextDto {
  userId: string;
  username: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}
