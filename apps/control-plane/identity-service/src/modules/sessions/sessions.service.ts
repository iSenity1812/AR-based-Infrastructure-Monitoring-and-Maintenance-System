import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './session.schema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async createSession(params: {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<Session> {
    const created = await this.sessionModel.create({
      userId: params.userId,
      refreshTokenHash: params.refreshTokenHash,
      expiresAt: params.expiresAt,
      lastUsedAt: new Date(),
    });
    return created.toObject();
  }

  async requireActiveSession(sessionId: string): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId).lean();
    if (!session) throw new UnauthorizedException('Invalid session');
    if (session.revokedAt) throw new UnauthorizedException('Session revoked');
    if (session.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Session expired');
    return session;
  }

  async rotateSession(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const result = await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { refreshTokenHash, expiresAt, lastUsedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      throw new UnauthorizedException('Invalid session');
  }

  async revokeSession(sessionId: string): Promise<void> {
    const result = await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { revokedAt: new Date(), lastUsedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      throw new UnauthorizedException('Invalid session');
  }

  assertSessionOwnedByUser(session: Session, userId: Types.ObjectId) {
    if (session.userId.toString() !== userId.toString()) {
      throw new UnauthorizedException('Session does not belong to user');
    }
  }
}
