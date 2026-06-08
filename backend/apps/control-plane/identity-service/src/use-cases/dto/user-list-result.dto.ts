import { AdminUserDto } from './admin-user.dto';

export interface UserListPageInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface UserListResult {
  items: AdminUserDto[];
  pageInfo: UserListPageInfo;
}
