import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CapabilityDocument = HydratedDocument<Capability>;

@Schema({ timestamps: true, collection: 'capabilities' })
export class Capability {
  @Prop({ required: true, unique: true, index: true })
  key!: string;

  @Prop({ required: true })
  description!: string;
}

export const CapabilitySchema = SchemaFactory.createForClass(Capability);
