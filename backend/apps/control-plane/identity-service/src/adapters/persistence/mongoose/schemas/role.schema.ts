import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { PermissionCode } from '@domain/constants/permission-code.constant';
import { RoleCode } from '@domain/constants/role-code.enum';

export type RoleDocument = HydratedDocument<RoleModel>;

@Schema({
  collection: 'roles',
  timestamps: true,
})
export class RoleModel {
  @Prop({ required: true, enum: RoleCode, unique: true })
  code!: RoleCode;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  permissionCodes!: PermissionCode[];

  @Prop({ required: true, default: true })
  isSystem!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(RoleModel);
