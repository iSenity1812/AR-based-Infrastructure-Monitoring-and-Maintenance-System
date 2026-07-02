import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { IncidentWorkflowServiceConfig } from '@infrastructure/config/incident-workflow-service-config';
import { IncidentWorkflowServiceModule } from '@infrastructure/di/incident-workflow-service.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/incident_workflow_db',
      }),
    }),
    IncidentWorkflowServiceModule,
  ],
  providers: [IncidentWorkflowServiceConfig],
})
export class AppModule {}
