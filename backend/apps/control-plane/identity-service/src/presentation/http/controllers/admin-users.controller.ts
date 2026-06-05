import {
  Body,
  Controller,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '../../../domain/constants/permission-code.constant';
import { ASSIGN_USER_ROLES_USE_CASE, CREATE_USER_USE_CASE, UPDATE_USER_STATUS_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { AssignUserRolesUseCase } from '../../../use-cases/commands/assign-user-roles.use-case';
import { CreateUserUseCase } from '../../../use-cases/commands/create-user.use-case';
import { UpdateUserStatusUseCase } from '../../../use-cases/commands/update-user-status.use-case';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AssignUserRolesRequestDto } from '../dto/assign-user-roles-request.dto';
import { CreateUserRequestDto } from '../dto/create-user-request.dto';
import { UpdateUserStatusRequestDto } from '../dto/update-user-status-request.dto';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSION_CODES.IDENTITY_USERS_MANAGE)
export class AdminUsersController {
  constructor(
    @Inject(CREATE_USER_USE_CASE)
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(UPDATE_USER_STATUS_USE_CASE)
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    @Inject(ASSIGN_USER_ROLES_USE_CASE)
    private readonly assignUserRolesUseCase: AssignUserRolesUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new identity user.' })
  async createUser(@Body() requestDto: CreateUserRequestDto) {
    const result = await this.createUserUseCase.execute({
      username: requestDto.username,
      email: requestDto.email,
      password: requestDto.password,
      roleCodes: requestDto.roleCodes ?? [],
    });

    return serializeEnvelope(result);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the lifecycle status of a user.' })
  @ApiParam({ name: 'id', description: 'User identifier.' })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() requestDto: UpdateUserStatusRequestDto,
  ) {
    const result = await this.updateUserStatusUseCase.execute(
      userId,
      requestDto.status,
    );

    return serializeEnvelope(result);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Assign role codes to a user.' })
  @ApiParam({ name: 'id', description: 'User identifier.' })
  async assignUserRoles(
    @Param('id') userId: string,
    @Body() requestDto: AssignUserRolesRequestDto,
  ) {
    const result = await this.assignUserRolesUseCase.execute(
      userId,
      requestDto.roleCodes,
    );

    return serializeEnvelope(result);
  }
}
