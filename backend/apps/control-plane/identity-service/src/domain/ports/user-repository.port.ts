import { IdentityUser } from '../entities/identity-user.entity';
import { RoleCode } from '../constants/role-code.enum';
import { UserStatus } from '../constants/user-status.enum';
import { type UserListQuery } from '../../use-cases/dto/user-list-query.dto';

export interface CreateIdentityUserRecord {
  username: string;
  email: string;
  passwordHash: string;
  roleCodes: RoleCode[];
  fullName: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  mustChangePassword: boolean;
  passwordChangedAt?: Date;
}

export interface UserListResult {
  items: IdentityUser[];
  totalItems: number;
}

export interface UserRepositoryPort {
  findById(userId: string): Promise<IdentityUser | null>;
  findAll(): Promise<IdentityUser[]>;
  findMany(query: UserListQuery): Promise<UserListResult>;
  findByEmail(email: string): Promise<IdentityUser | null>;
  existsByUsernameOrEmail(username: string, email: string): Promise<boolean>;
  create(input: CreateIdentityUserRecord): Promise<IdentityUser>;
  updateStatus(userId: string, status: UserStatus): Promise<IdentityUser | null>;
  updateRoles(userId: string, roleCodes: RoleCode[]): Promise<IdentityUser | null>;
  updatePassword(
    userId: string,
    passwordHash: string,
    changedAt: Date,
  ): Promise<IdentityUser | null>;
  markLastLogin(userId: string, loggedInAt: Date): Promise<IdentityUser | null>;
  searchByUsername(
    query: string,
    options: UserListQuery,
  ): Promise<UserListResult>;
}
