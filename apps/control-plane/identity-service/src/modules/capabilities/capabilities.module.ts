import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Capability, CapabilitySchema } from './capability.schema';
import { CapabilitiesService } from './capabilities.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Capability.name, schema: CapabilitySchema },
    ]),
  ],
  providers: [CapabilitiesService],
  exports: [CapabilitiesService, MongooseModule],
})
export class CapabilitiesModule {}
