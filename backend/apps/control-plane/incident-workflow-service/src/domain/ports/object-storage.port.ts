export interface CreatePresignedUploadInput {
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface PresignedUploadTarget {
  method: 'PUT';
  uploadUrl: string;
  objectKey: string;
  headers: Record<string, string>;
  expiresAt: Date;
  objectUrl?: string;
}

export interface ObjectStoragePort {
  isConfigured(): boolean;
  createPresignedUpload(
    input: CreatePresignedUploadInput,
  ): Promise<PresignedUploadTarget>;
}
