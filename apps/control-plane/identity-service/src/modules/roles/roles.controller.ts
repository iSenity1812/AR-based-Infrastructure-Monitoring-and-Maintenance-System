import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async listRoles() {
    const roles = await this.rolesService.listRoles();
    return roles.map((role) => ({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      capabilityKeys: role.capabilityKeys,
    }));
  }
}
