import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '../../../domain/constants/permission-code.constant';
import { RoleCode } from '../../../domain/constants/role-code.enum';
import { UserStatus } from '../../../domain/constants/user-status.enum';
import { LIST_USERS_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { ListUsersUseCase } from '../../../use-cases/queries/list-users.use-case';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PasswordChangeRequiredGuard } from '../guards/password-change-required.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('Technicians')
@ApiBearerAuth()
@Controller('technicians')
@UseGuards(JwtAuthGuard, PasswordChangeRequiredGuard, PermissionsGuard)
@RequirePermissions(PERMISSION_CODES.TICKETS_CREATE)
export class TechniciansController {
  constructor(
    @Inject(LIST_USERS_USE_CASE)
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active maintenance technicians for ticket assignment.' })
  async listTechnicians() {
    const result = await this.listUsersUseCase.execute({
      page: 1,
      limit: 100,
      roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
      status: UserStatus.ACTIVE,
    });

    return result.items;
  }
}
