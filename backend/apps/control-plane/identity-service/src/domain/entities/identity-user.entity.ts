import { RoleCode } from '../constants/role-code.enum';
import { UserStatus } from '../constants/user-status.enum';

export interface IdentityUserProps {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  roleCodes: RoleCode[];
  fullName: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  mustChangePassword: boolean;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class IdentityUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly status: UserStatus;
  readonly roleCodes: RoleCode[];
  readonly fullName: string;
  readonly phoneNumber?: string;
  readonly jobTitle?: string;
  readonly department?: string;
  readonly avatarUrl?: string;
  readonly mustChangePassword: boolean;
  readonly passwordChangedAt?: Date;
  readonly lastLoginAt?: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: IdentityUserProps) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.status = props.status;
    this.roleCodes = props.roleCodes;
    this.fullName = props.fullName;
    this.phoneNumber = props.phoneNumber;
    this.jobTitle = props.jobTitle;
    this.department = props.department;
    this.avatarUrl = props.avatarUrl;
    this.mustChangePassword = props.mustChangePassword;
    this.passwordChangedAt = props.passwordChangedAt;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  canLogin(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  withStatus(status: UserStatus): IdentityUser {
    return new IdentityUser({
      ...this,
      status,
    });
  }

  withRoles(roleCodes: RoleCode[]): IdentityUser {
    return new IdentityUser({
      ...this,
      roleCodes,
    });
  }
}
