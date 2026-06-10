import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

import type { AssetQueryCachePort } from '@domain/ports/repositories.port';

interface CacheLike {
  get<T>(key: string): Promise<T | null | undefined>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

@Injectable()
export class CacheManagerAssetQueryCacheAdapter implements AssetQueryCachePort {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: CacheLike) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.cache.get<T>(key);
    return value ?? undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(
      key,
      value,
      ttlMs ? { ttl: Math.ceil(ttlMs / 1000) } : undefined,
    );
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
