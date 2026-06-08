import { RoleCode } from '@domain/constants/role-code.enum';
import { UserStatus } from '@domain/constants/user-status.enum';

export enum UserSortField {
  USERNAME = 'username',
  EMAIL = 'email',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  status?: UserStatus;
  roleCodes?: RoleCode[];
  sortBy?: UserSortField;
  sortDirection?: SortDirection;
}

