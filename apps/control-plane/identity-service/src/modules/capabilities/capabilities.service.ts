import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Capability, CapabilityDocument } from './capability.schema';

export type CapabilitySeed = {
  key: string;
  description: string;
};

@Injectable()
export class CapabilitiesService {
  constructor(
    @InjectModel(Capability.name)
    private readonly capabilityModel: Model<CapabilityDocument>,
  ) {}

  async upsertMany(capabilities: CapabilitySeed[]): Promise<void> {
    if (capabilities.length === 0) return;

    await Promise.all(
      capabilities.map((capability) =>
        this.capabilityModel.updateOne(
          { key: capability.key },
          {
            $setOnInsert: capability,
            $set: { description: capability.description },
          },
          { upsert: true },
        ),
      ),
    );
  }

  async listAll(): Promise<Capability[]> {
    return this.capabilityModel.find().sort({ key: 1 }).lean();
  }
}
