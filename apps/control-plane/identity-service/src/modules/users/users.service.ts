import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../roles/role.schema';
import { UserStatus } from './user-status.enum';
import { User, UserDocument } from './user.schema';

export type CreateUserParams = {
  username: string;
  email: string;
  passwordHash: string;
  roleIds: Types.ObjectId[];
  status?: UserStatus;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();
    return this.userModel
      .findOne({
        $or: [
          { username: identifier },
          { email: normalized },
          { email: identifier },
        ],
      })
      .lean();
  }

  async requireById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async requireByIdWithRoles(userId: string): Promise<
    Pick<User, '_id' | 'username' | 'email' | 'passwordHash' | 'status'> & {
      roles: Role[];
    }
  > {
    const user = await this.userModel
      .findById(userId)
      .populate<{ roleIds: Role[] }>('roleIds')
      .lean();
    if (!user) throw new NotFoundException('User not found');

    const roles = (user.roleIds ?? []) as unknown as Role[];
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      roles,
    };
  }

  async createUser(params: CreateUserParams): Promise<User> {
    const existing = await this.userModel
      .findOne({
        $or: [{ username: params.username }, { email: params.email }],
      })
      .lean();
    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const created = await this.userModel.create({
      username: params.username,
      email: params.email,
      passwordHash: params.passwordHash,
      roleIds: params.roleIds,
      status: params.status ?? UserStatus.ACTIVE,
    });
    return created.toObject();
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      { $set: { status } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException('User not found');
  }

  async updateRoles(userId: string, roleIds: Types.ObjectId[]): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      { $set: { roleIds } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException('User not found');
  }

  toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }
}
