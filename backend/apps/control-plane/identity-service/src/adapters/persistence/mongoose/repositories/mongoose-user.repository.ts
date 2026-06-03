import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { IdentityUser } from "@domain/entities/identity-user.entity";
import { RoleCode } from "@domain/constants/role-code.enum";
import { UserStatus } from "@domain/constants/user-status.enum";
import type {
  CreateIdentityUserRecord,
  UserRepositoryPort,
} from "@domain/ports/user-repository.port";
import { UserModel, type UserDocument } from "../schemas/user.schema";

@Injectable()
export class MongooseUserRepository implements UserRepositoryPort {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(userId: string): Promise<IdentityUser | null> {
    const user = await this.userModel.findById(userId).lean();

    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<IdentityUser | null> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail }).lean();

    return user ? this.toEntity(user) : null;
  }

  async existsByUsernameOrEmail(
    username: string,
    email: string,
  ): Promise<boolean> {
    const count = await this.userModel.countDocuments({
      $or: [{ username }, { email }],
    });

    return count > 0;
  }

  async create(input: CreateIdentityUserRecord): Promise<IdentityUser> {
    const user = await this.userModel.create({
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      status: UserStatus.ACTIVE,
      roleCodes: input.roleCodes,
    });

    return this.toEntity(user.toObject());
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
  ): Promise<IdentityUser | null> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { status } }, { new: true })
      .lean();

    return user ? this.toEntity(user) : null;
  }

  async updateRoles(
    userId: string,
    roleCodes: RoleCode[],
  ): Promise<IdentityUser | null> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { roleCodes } }, { new: true })
      .lean();

    return user ? this.toEntity(user) : null;
  }

  private toEntity(user: {
    _id: unknown;
    username: string;
    email: string;
    passwordHash: string;
    status: UserStatus;
    roleCodes: RoleCode[];
    createdAt?: Date;
    updatedAt?: Date;
  }): IdentityUser {
    return new IdentityUser({
      id: String(user._id),
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      roleCodes: user.roleCodes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
