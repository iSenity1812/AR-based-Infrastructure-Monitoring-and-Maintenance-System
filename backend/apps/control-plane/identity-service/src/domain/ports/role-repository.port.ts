import { RoleCode } from '../constants/role-code.enum';
import { IdentityRole } from '../entities/identity-role.entity';

export interface RoleRepositoryPort {
  findAll(): Promise<IdentityRole[]>;
  findByCodes(roleCodes: RoleCode[]): Promise<IdentityRole[]>;
  upsertSystemRoles(roles: IdentityRole[]): Promise<void>;
}
