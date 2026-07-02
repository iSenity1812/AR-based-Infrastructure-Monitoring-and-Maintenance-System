import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, type Producer } from 'kafkajs';

import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';
import type { NodeMappingEventPublisherPort } from '@domain/ports/node-mapping-event.publisher.port';

@Injectable()
export class KafkaNodeMappingPublisher
  implements NodeMappingEventPublisherPort, OnModuleInit, OnModuleDestroy
{
  private readonly producer: Producer;

  constructor(private readonly config: AssetServiceConfig) {
    const kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
    });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publishNodeMapping(nodeCode: string, rackId: string | null) {
    await this.producer.send({
      topic: this.config.assetNodeMappingTopic,
      messages: [
        {
          key: nodeCode,
          value: JSON.stringify({ rackId }),
        },
      ],
    });
  }
}
