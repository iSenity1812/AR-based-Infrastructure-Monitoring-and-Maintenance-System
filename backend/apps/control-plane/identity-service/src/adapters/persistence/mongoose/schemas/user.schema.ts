import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { RoleCode } from '@domain/constants/role-code.enum';
import { UserStatus } from '@domain/constants/user-status.enum';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class UserModel {
  @Prop({ required: true, unique: true, trim: true })
  username!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Prop({ type: [String], enum: RoleCode, default: [] })
  roleCodes!: RoleCode[];

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ trim: true, default: null })
  phoneNumber?: string;

  @Prop({ trim: true, default: null })
  jobTitle?: string;

  @Prop({ trim: true, default: null })
  department?: string;

  @Prop({ trim: true, default: null })
  avatarUrl?: string;

  @Prop({ required: true, default: true })
  mustChangePassword!: boolean;

  @Prop({ default: null })
  passwordChangedAt?: Date;

  @Prop({ default: null })
  lastLoginAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
