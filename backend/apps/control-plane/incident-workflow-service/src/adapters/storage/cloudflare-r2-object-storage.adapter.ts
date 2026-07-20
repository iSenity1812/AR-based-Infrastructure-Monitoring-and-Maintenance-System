import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { IncidentWorkflowServiceConfig } from '@infrastructure/config/incident-workflow-service-config';
import type {
  CreatePresignedUploadInput,
  ObjectStoragePort,
  PresignedUploadTarget,
} from '@domain/ports/object-storage.port';

function encodeObjectKey(objectKey: string): string {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

@Injectable()
export class CloudflareR2ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client | null;

  constructor(private readonly config: IncidentWorkflowServiceConfig) {
    this.client = this.isConfigured()
      ? new S3Client({
          region: 'auto',
          endpoint: this.config.r2Endpoint,
          credentials: {
            accessKeyId: this.config.r2AccessKeyId,
            secretAccessKey: this.config.r2SecretAccessKey,
          },
        })
      : null;
  }

  isConfigured(): boolean {
    return this.config.r2Configured;
  }

  async createPresignedUpload(
    input: CreatePresignedUploadInput,
  ): Promise<PresignedUploadTarget> {
    if (!this.client) {
      throw new Error('Cloudflare R2 is not configured.');
    }

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.r2BucketName,
        Key: input.objectKey,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresInSeconds },
    );

    const objectUrl = this.config.r2PublicBaseUrl
      ? `${this.config.r2PublicBaseUrl}/${encodeObjectKey(input.objectKey)}`
      : undefined;

    return {
      method: 'PUT',
      uploadUrl,
      objectKey: input.objectKey,
      headers: {
        'Content-Type': input.contentType,
      },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      objectUrl,
    };
  }
}
