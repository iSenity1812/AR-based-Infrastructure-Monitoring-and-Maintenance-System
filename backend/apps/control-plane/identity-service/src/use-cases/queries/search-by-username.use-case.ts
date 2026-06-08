import { UserRepositoryPort } from "@domain/ports/user-repository.port";
import { UserListQuery } from "@use-cases/dto/user-list-query.dto";
import { UserListResult } from "@use-cases/dto/user-list-result.dto";
import { toAdminUserDto } from '@use-cases/dto/user-view.mapper';

export class GetByUsernameUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(
    usernameKeyword: string,
    options: UserListQuery,
  ): Promise<UserListResult> {
    if (!usernameKeyword || usernameKeyword.trim() === "") {
      return {
        items: [],
        pageInfo: {
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }
    return this.userRepository
      .searchByUsername(usernameKeyword.trim(), options)
      .then((result) => ({
        items: result.items.map((item) => toAdminUserDto(item)),
        pageInfo: {
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          totalItems: result.totalItems,
          totalPages: Math.max(
            1,
            Math.ceil(result.totalItems / (options.limit ?? 20)),
          ),
        },
      }));
  }
}
