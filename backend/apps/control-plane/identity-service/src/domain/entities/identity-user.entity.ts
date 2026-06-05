import { RoleCode } from '../constants/role-code.enum';
import { UserStatus } from '../constants/user-status.enum';

export interface IdentityUserProps {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  roleCodes: RoleCode[];
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
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: IdentityUserProps) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.status = props.status;
    this.roleCodes = props.roleCodes;
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
