import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { LIST_ROLES_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { ListRolesUseCase } from '../../../use-cases/queries/list-roles.use-case';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(
    @Inject(LIST_ROLES_USE_CASE)
    private readonly listRolesUseCase: ListRolesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all available identity roles.' })
  async getRoles() {
    return this.listRolesUseCase.execute();
  }
}
