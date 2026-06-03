import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { RoleCode } from "@domain/constants/role-code.enum";
import { IdentityRole } from "@domain/entities/identity-role.entity";
import type { RoleRepositoryPort } from "@domain/ports/role-repository.port";
import { RoleModel, type RoleDocument } from "../schemas/role.schema";
import { PermissionCode } from "@domain/constants/permission-code.constant";

@Injectable()
export class MongooseRoleRepository implements RoleRepositoryPort {
  constructor(
    @InjectModel(RoleModel.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async findAll(): Promise<IdentityRole[]> {
    const roles = await this.roleModel.find().sort({ code: 1 }).lean();

    return roles.map((role) => this.toEntity(role));
  }

  async findByCodes(roleCodes: RoleCode[]): Promise<IdentityRole[]> {
    if (roleCodes.length === 0) {
      return [];
    }

    const roles = await this.roleModel
      .find({ code: { $in: roleCodes } })
      .lean();

    return roles.map((role) => this.toEntity(role));
  }

  async upsertSystemRoles(roles: IdentityRole[]): Promise<void> {
    for (const role of roles) {
      await this.roleModel.findOneAndUpdate(
        { code: role.code },
        {
          $set: {
            name: role.name,
            description: role.description,
            permissionCodes: role.permissionCodes,
            isSystem: role.isSystem,
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    }
  }

  private toEntity(role: {
    code: RoleCode;
    name: string;
    description: string;
    permissionCodes: PermissionCode[];
    isSystem: boolean;
  }): IdentityRole {
    return new IdentityRole({
      code: role.code,
      name: role.name,
      description: role.description,
      permissionCodes: role.permissionCodes,
      isSystem: role.isSystem,
    });
  }
}
