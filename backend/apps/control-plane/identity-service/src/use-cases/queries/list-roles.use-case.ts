import { IdentityRole } from '../../domain/entities/identity-role.entity';
import { RoleRepositoryPort } from '../../domain/ports/role-repository.port';

export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepositoryPort) {}

  execute(): Promise<IdentityRole[]> {
    return this.roleRepository.findAll();
  }
}
