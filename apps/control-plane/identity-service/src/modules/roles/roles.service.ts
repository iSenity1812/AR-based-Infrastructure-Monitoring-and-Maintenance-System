import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './role.schema';

export type RoleSeed = {
  name: string;
  description?: string;
  capabilityKeys: string[];
};

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async upsertMany(roles: RoleSeed[]): Promise<void> {
    if (roles.length === 0) return;

    await Promise.all(
      roles.map((role) =>
        this.roleModel.updateOne(
          { name: role.name },
          {
            $setOnInsert: { name: role.name },
            $set: {
              description: role.description,
              capabilityKeys: role.capabilityKeys,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  async listRoles(): Promise<Role[]> {
    return this.roleModel.find().sort({ name: 1 }).lean();
  }

  async findByNames(roleNames: string[]): Promise<Role[]> {
    if (roleNames.length === 0) return [];
    return this.roleModel.find({ name: { $in: roleNames } }).lean();
  }

  async requireById(roleId: string): Promise<Role> {
    const role = await this.roleModel.findById(roleId).lean();
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async requireByName(roleName: string): Promise<Role> {
    const role = await this.roleModel.findOne({ name: roleName }).lean();
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }
}
