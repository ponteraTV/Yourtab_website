import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { PresignedUpload, PresignedUploadInput, StorageProvider } from "./types.js";

const DEFAULT_UPLOAD_EXPIRY_SECONDS = 15 * 60;
const MAX_UPLOAD_EXPIRY_SECONDS = 60 * 60;

export interface S3StorageProviderOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  /** Endpoint exposed to upload clients; useful when MinIO is reached through a different hostname. */
  publicEndpoint?: string;
  forcePathStyle?: boolean;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  client?: S3Client;
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  public constructor(private readonly options: S3StorageProviderOptions) {
    this.client = options.client ?? new S3Client({
      region: options.region,
      // A presigned URL is signed for its host, so it must use the endpoint
      // reachable by clients. `endpoint` is used when both endpoints match.
      endpoint: options.publicEndpoint ?? options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: options.credentials,
    });
  }

  public async createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload> {
    const expiresIn = input.expiresIn ?? DEFAULT_UPLOAD_EXPIRY_SECONDS;
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > MAX_UPLOAD_EXPIRY_SECONDS) {
      throw new RangeError(`expiresIn must be an integer between 1 and ${MAX_UPLOAD_EXPIRY_SECONDS} seconds`);
    }

    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: input.key,
      ContentType: input.contentType,
      Metadata: input.metadata,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      key: input.key,
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      requiredHeaders: { "content-type": input.contentType },
    };
  }
}
