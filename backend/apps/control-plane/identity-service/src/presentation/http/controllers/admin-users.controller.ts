import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { PERMISSION_CODES } from "../../../domain/constants/permission-code.constant";
import {
  ASSIGN_USER_ROLES_USE_CASE,
  CREATE_USER_USE_CASE,
  GET_BY_USERNAME_USE_CASE,
  LIST_USERS_USE_CASE,
  UPDATE_USER_STATUS_USE_CASE,
} from "../../../infrastructure/di/use-case.tokens";
import { AssignUserRolesUseCase } from "../../../use-cases/commands/assign-user-roles.use-case";
import { CreateUserUseCase } from "../../../use-cases/commands/create-user.use-case";
import { UpdateUserStatusUseCase } from "../../../use-cases/commands/update-user-status.use-case";
import { RequirePermissions } from "../decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { PasswordChangeRequiredGuard } from "../guards/password-change-required.guard";
import { PermissionsGuard } from "../guards/permissions.guard";
import { AssignUserRolesRequestDto } from "../dto/assign-user-roles-request.dto";
import { CreateUserRequestDto } from "../dto/create-user-request.dto";
import {
  ListUsersQueryDto,
} from "../dto/list-users-query.dto";
import { UpdateUserStatusRequestDto } from "../dto/update-user-status-request.dto";
import { serializeEnvelope } from "../serializers/api-envelope.serializer";
import { ListUsersUseCase } from "@use-cases/queries/list-users.use-case";
import { GetByUsernameUseCase } from "@use-cases/queries/search-by-username.use-case";
import {
  SortDirection,
  UserSortField,
} from "@use-cases/dto/user-list-query.dto";

@ApiTags("Admin Users")
@ApiBearerAuth()
@Controller("admin/users")
@UseGuards(JwtAuthGuard, PasswordChangeRequiredGuard, PermissionsGuard)
@RequirePermissions(PERMISSION_CODES.IDENTITY_USERS_MANAGE)
export class AdminUsersController {
  constructor(
    @Inject(CREATE_USER_USE_CASE)
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(UPDATE_USER_STATUS_USE_CASE)
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    @Inject(ASSIGN_USER_ROLES_USE_CASE)
    private readonly assignUserRolesUseCase: AssignUserRolesUseCase,
    @Inject(LIST_USERS_USE_CASE)
    private readonly findAllUsersUseCase: ListUsersUseCase,
    @Inject(GET_BY_USERNAME_USE_CASE)
    private readonly findByUsernameUseCase: GetByUsernameUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new identity user." })
  async createUser(@Body() requestDto: CreateUserRequestDto) {
    const result = await this.createUserUseCase.execute({
      username: requestDto.username,
      email: requestDto.email,
      fullName: requestDto.fullName,
      phoneNumber: requestDto.phoneNumber,
      jobTitle: requestDto.jobTitle,
      department: requestDto.department,
      avatarUrl: requestDto.avatarUrl,
      roleCodes: requestDto.roleCodes ?? [],
    });

    return serializeEnvelope(result);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update the lifecycle status of a user." })
  @ApiParam({ name: "id", description: "User identifier." })
  async updateUserStatus(
    @Param("id") userId: string,
    @Body() requestDto: UpdateUserStatusRequestDto,
  ) {
    const result = await this.updateUserStatusUseCase.execute(
      userId,
      requestDto.status,
    );

    return serializeEnvelope(result);
  }

  @Put(":id/roles")
  @ApiOperation({ summary: "Assign role codes to a user." })
  @ApiParam({ name: "id", description: "User identifier." })
  async assignUserRoles(
    @Param("id") userId: string,
    @Body() requestDto: AssignUserRolesRequestDto,
  ) {
    const result = await this.assignUserRolesUseCase.execute(
      userId,
      requestDto.roleCodes,
    );

    return serializeEnvelope(result);
  }

  @Get()
  @ApiOperation({ summary: "Retrieve a list of all identity users." })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "username", required: false, type: String })
  @ApiQuery({ name: "email", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "LOCKED", "INACTIVE"] })
  @ApiQuery({ name: "roleCodes", required: false, isArray: true, enum: ["IT_ADMINISTRATOR", "SYSTEM_MONITORING_OPERATOR", "MAINTENANCE_TECHNICIAN"] })
  @ApiQuery({ name: "sortBy", required: false, enum: UserSortField })
  @ApiQuery({ name: "sortDirection", required: false, enum: SortDirection })
  async findAllUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.findAllUsersUseCase.execute(query);
    return serializeEnvelope(result);
  }

  @Get(":username")
  @ApiOperation({ summary: "Get a user by username." })
  @ApiParam({ name: "username", description: "Username of the user." })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "email", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "LOCKED", "INACTIVE"] })
  @ApiQuery({ name: "roleCodes", required: false, isArray: true, enum: ["IT_ADMINISTRATOR", "SYSTEM_MONITORING_OPERATOR", "MAINTENANCE_TECHNICIAN"] })
  @ApiQuery({ name: "sortBy", required: false, enum: UserSortField })
  @ApiQuery({ name: "sortDirection", required: false, enum: SortDirection })
  async findByUsername(
    @Param("username") username: string,
    @Query() query: ListUsersQueryDto,
  ) {
    const result = await this.findByUsernameUseCase.execute(username, query);
    return serializeEnvelope(result);
  }
}
