import { Injectable } from '@nestjs/common';
import { DEFAULT_REDIS, RedisService } from '@liaoliaots/nestjs-redis';

import type { DiscoveredNodeEntity } from '@domain/entities/asset-context.entities';
import type { DiscoveredNodeRepositoryPort } from '@domain/ports/repositories.port';

const NODE_AGENTS_KEY = 'nodes:agents';

@Injectable()
export class RedisDiscoveredNodeRepository implements DiscoveredNodeRepositoryPort {
  private readonly client: ReturnType<RedisService['getOrThrow']>;

  constructor(redisService: RedisService) {
    this.client = redisService.getOrThrow(DEFAULT_REDIS);
  }

  async listAll(): Promise<DiscoveredNodeEntity[]> {
    const agentIds = await this.client.smembers(NODE_AGENTS_KEY);
    if (agentIds.length === 0) {
      return [];
    }

    const pipeline = this.client.pipeline();
    for (const agentId of agentIds) {
      pipeline.get(this.agentNodeKey(agentId));
    }

    const results = await pipeline.exec();
    if (!results) {
      return [];
    }

    return results
      .map((entry) => entry[1])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => JSON.parse(value) as DiscoveredNodeEntity)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findByAgentId(agentId: string): Promise<DiscoveredNodeEntity | null> {
    const rawValue = await this.client.get(this.agentNodeKey(agentId));
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as DiscoveredNodeEntity;
  }

  async save(node: DiscoveredNodeEntity): Promise<DiscoveredNodeEntity> {
    await this.client
      .multi()
      .set(this.agentNodeKey(node.agentId), JSON.stringify(node))
      .sadd(NODE_AGENTS_KEY, node.agentId)
      .exec();

    return node;
  }

  private agentNodeKey(agentId: string) {
    return `node:agent:${agentId}`;
  }
}
