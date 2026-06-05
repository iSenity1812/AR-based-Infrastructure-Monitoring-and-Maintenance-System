import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { IdentitySession } from '@domain/entities/identity-session.entity';
import type {
  CreateSessionRecord,
  SessionRepositoryPort,
} from '@domain/ports/session-repository.port';
import {
  SessionModel,
  type SessionDocument,
} from '../schemas/session.schema';

@Injectable()
export class MongooseSessionRepository implements SessionRepositoryPort {
  constructor(
    @InjectModel(SessionModel.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(input: CreateSessionRecord): Promise<IdentitySession> {
    const session = await this.sessionModel.create({
      userId: new Types.ObjectId(input.userId),
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return this.toEntity(session.toObject());
  }

  async findById(sessionId: string): Promise<IdentitySession | null> {
    const session = await this.sessionModel.findById(sessionId).lean();

    return session ? this.toEntity(session) : null;
  }

  async updateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<IdentitySession | null> {
    const session = await this.sessionModel
      .findByIdAndUpdate(
        sessionId,
        {
          $set: {
            refreshTokenHash,
            expiresAt,
          },
        },
        { new: true },
      )
      .lean();

    return session ? this.toEntity(session) : null;
  }

  async revoke(sessionId: string, revokedAt: Date): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      $set: { revokedAt },
    });
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.sessionModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        revokedAt: { $exists: false },
      },
      {
        $set: { revokedAt },
      },
    );
  }

  private toEntity(session: {
    _id: unknown;
    userId: Types.ObjectId;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    userAgent?: string;
    ipAddress?: string;
  }): IdentitySession {
    return new IdentitySession({
      id: String(session._id),
      userId: String(session.userId),
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    });
  }
}
