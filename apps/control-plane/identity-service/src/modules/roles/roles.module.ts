import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './role.schema';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    AuthModule,
  ],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService, MongooseModule],
})
export class RolesModule {}
