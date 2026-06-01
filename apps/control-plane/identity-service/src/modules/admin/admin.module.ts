import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { ParseObjectIdPipe } from '../../common/parse-objectid.pipe';

@Module({
  imports: [AuthModule, UsersModule, RolesModule],
  controllers: [AdminController],
  providers: [ParseObjectIdPipe],
})
export class AdminModule {}
