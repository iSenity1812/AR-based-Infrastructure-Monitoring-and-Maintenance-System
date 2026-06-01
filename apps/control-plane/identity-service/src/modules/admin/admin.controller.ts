import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ParseObjectIdPipe } from '../../common/parse-objectid.pipe';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RequireRoles } from '../auth/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles('IT Administrator')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Post('users')
  @RequirePermissions('identity.users.create')
  async createUser(@Body() body: CreateUserDto) {
    const roles = await this.rolesService.findByNames(body.roleNames);
    if (roles.length !== body.roleNames.length) {
      throw new BadRequestException('Unknown role');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const created = await this.usersService.createUser({
      username: body.username,
      email: body.email.toLowerCase(),
      passwordHash,
      roleIds: roles.map((role) =>
        this.usersService.toObjectId(role._id.toString()),
      ),
      status: body.status,
    });

    return {
      id: created._id.toString(),
      username: created.username,
      email: created.email,
      status: created.status,
      roleIds: created.roleIds.map((id) => id.toString()),
    };
  }

  @Patch('users/:id/status')
  @RequirePermissions('identity.users.updateStatus')
  async updateUserStatus(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    await this.usersService.updateStatus(userId, body.status);
    return { success: true };
  }

  @Put('users/:id/roles')
  @RequirePermissions('identity.users.assignRoles')
  async updateUserRoles(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: UpdateUserRolesDto,
  ) {
    const roles = await this.rolesService.findByNames(body.roleNames);
    if (roles.length !== body.roleNames.length) {
      throw new BadRequestException('Unknown role');
    }

    await this.usersService.updateRoles(
      userId,
      roles.map((role) => this.usersService.toObjectId(role._id.toString())),
    );
    return { success: true };
  }
}
