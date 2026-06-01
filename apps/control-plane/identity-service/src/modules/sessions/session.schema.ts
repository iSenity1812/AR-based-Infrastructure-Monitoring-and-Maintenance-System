import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  refreshTokenHash!: string;

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  lastUsedAt?: Date;

  _id!: Types.ObjectId;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
