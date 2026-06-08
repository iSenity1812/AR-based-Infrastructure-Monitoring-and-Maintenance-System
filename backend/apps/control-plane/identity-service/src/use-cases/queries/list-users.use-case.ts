import { UserRepositoryPort } from "@domain/ports/user-repository.port";
import { UserListQuery } from "@use-cases/dto/user-list-query.dto";
import { UserListResult } from "@use-cases/dto/user-list-result.dto";
import { toAdminUserDto } from '@use-cases/dto/user-view.mapper';

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  execute(query: UserListQuery): Promise<UserListResult> {
    return this.userRepository.findMany(query).then((result) => ({
      items: result.items.map((item) => toAdminUserDto(item)),
      pageInfo: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalItems: result.totalItems,
        totalPages: Math.max(1, Math.ceil(result.totalItems / (query.limit ?? 20))),
      },
    }));
  }
}
