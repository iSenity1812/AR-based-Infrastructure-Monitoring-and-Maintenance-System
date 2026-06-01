import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true, unique: true, index: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  capabilityKeys!: string[];

  _id!: Types.ObjectId;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
