import type { PermissionCode } from '../constants/permission-code.constant';
import { RoleCode } from '../constants/role-code.enum';

export interface IdentityRoleProps {
  code: RoleCode;
  name: string;
  description: string;
  permissionCodes: PermissionCode[];
  isSystem: boolean;
}

export class IdentityRole {
  readonly code: RoleCode;
  readonly name: string;
  readonly description: string;
  readonly permissionCodes: PermissionCode[];
  readonly isSystem: boolean;

  constructor(props: IdentityRoleProps) {
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.permissionCodes = props.permissionCodes;
    this.isSystem = props.isSystem;
  }
}
