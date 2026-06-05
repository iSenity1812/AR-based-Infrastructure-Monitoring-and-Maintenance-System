import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '../../../domain/constants/permission-code.constant';
import { LIST_ROLES_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { ListRolesUseCase } from '../../../use-cases/queries/list-roles.use-case';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    @Inject(LIST_ROLES_USE_CASE)
    private readonly listRolesUseCase: ListRolesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List available identity roles.' })
  @RequirePermissions(PERMISSION_CODES.IDENTITY_USERS_MANAGE)
  async listRoles() {
    const result = await this.listRolesUseCase.execute();

    return serializeEnvelope(result);
  }
}
