import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { IdentityUser } from "@domain/entities/identity-user.entity";
import { RoleCode } from "@domain/constants/role-code.enum";
import { UserStatus } from "@domain/constants/user-status.enum";
import type {
  CreateIdentityUserRecord,
  UserListResult,
  UserRepositoryPort,
} from "@domain/ports/user-repository.port";
import { UserModel, type UserDocument } from "../schemas/user.schema";
import {
  SortDirection,
  UserSortField,
  type UserListQuery,
} from "../../../../use-cases/dto/user-list-query.dto";

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

  async findAll(): Promise<IdentityUser[]> {
    const users = await this.userModel.find().lean();
    return users.map((user) => this.toEntity(user));
  }

  async findMany(query: UserListQuery): Promise<UserListResult> {
    return this.findWithQuery(query, {});
  }
  
  async searchByUsername(
    query: string,
    options: UserListQuery,
  ): Promise<UserListResult> {
    return this.findWithQuery({ ...options, username: query }, { username: query });
  }

  private async findWithQuery(
    query: UserListQuery,
    usernameMatch: { username?: string },
  ): Promise<UserListResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const filter: Record<string, unknown> = {};

    if (query.username?.trim()) {
      filter.username = new RegExp(query.username.trim(), 'i');
    } else if (usernameMatch.username?.trim()) {
      filter.username = new RegExp(usernameMatch.username.trim(), 'i');
    }

    if (query.email?.trim()) {
      filter.email = new RegExp(query.email.trim(), 'i');
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.roleCodes?.length) {
      filter.roleCodes = { $in: query.roleCodes };
    }

    const sortBy = this.resolveSortField(query.sortBy);
    const sortDirection = query.sortDirection === SortDirection.ASC ? 1 : -1;

    const [items, totalItems] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      items: items.map((user) => this.toEntity(user)),
      totalItems,
    };
  }

  private resolveSortField(sortBy?: UserSortField): string {
    switch (sortBy) {
      case UserSortField.USERNAME:
        return 'username';
      case UserSortField.EMAIL:
        return 'email';
      case UserSortField.STATUS:
        return 'status';
      case UserSortField.UPDATED_AT:
        return 'updatedAt';
      case UserSortField.CREATED_AT:
      default:
        return 'createdAt';
    }
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
      fullName: input.fullName,
      phoneNumber: input.phoneNumber ?? null,
      jobTitle: input.jobTitle ?? null,
      department: input.department ?? null,
      avatarUrl: input.avatarUrl ?? null,
      mustChangePassword: input.mustChangePassword,
      passwordChangedAt: input.passwordChangedAt ?? null,
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

  async updatePassword(
    userId: string,
    passwordHash: string,
    changedAt: Date,
  ): Promise<IdentityUser | null> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            passwordHash,
            mustChangePassword: false,
            passwordChangedAt: changedAt,
          },
        },
        { new: true },
      )
      .lean();

    return user ? this.toEntity(user) : null;
  }

  async markLastLogin(
    userId: string,
    loggedInAt: Date,
  ): Promise<IdentityUser | null> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            lastLoginAt: loggedInAt,
          },
        },
        { new: true },
      )
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
    fullName: string;
    phoneNumber?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    avatarUrl?: string | null;
    mustChangePassword: boolean;
    passwordChangedAt?: Date | null;
    lastLoginAt?: Date | null;
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
      fullName: user.fullName,
      phoneNumber: user.phoneNumber ?? undefined,
      jobTitle: user.jobTitle ?? undefined,
      department: user.department ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      mustChangePassword: user.mustChangePassword,
      passwordChangedAt: user.passwordChangedAt ?? undefined,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
