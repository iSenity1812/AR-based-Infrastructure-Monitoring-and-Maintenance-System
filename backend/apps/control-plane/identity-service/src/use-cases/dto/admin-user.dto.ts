import { RoleCode } from "../../domain/constants/role-code.enum";
import { UserStatus } from "../../domain/constants/user-status.enum";

export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  roleCodes: RoleCode[];
  mustChangePassword: boolean;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
