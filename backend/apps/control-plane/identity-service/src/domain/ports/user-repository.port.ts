import { IdentityUser } from '../entities/identity-user.entity';
import { RoleCode } from '../constants/role-code.enum';
import { UserStatus } from '../constants/user-status.enum';

export interface CreateIdentityUserRecord {
  username: string;
  email: string;
  passwordHash: string;
  roleCodes: RoleCode[];
}

export interface UserRepositoryPort {
  findById(userId: string): Promise<IdentityUser | null>;
  findByEmail(email: string): Promise<IdentityUser | null>;
  existsByUsernameOrEmail(username: string, email: string): Promise<boolean>;
  create(input: CreateIdentityUserRecord): Promise<IdentityUser>;
  updateStatus(userId: string, status: UserStatus): Promise<IdentityUser | null>;
  updateRoles(userId: string, roleCodes: RoleCode[]): Promise<IdentityUser | null>;
}
