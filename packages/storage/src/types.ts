/** A narrow abstraction so application code is independent of a storage vendor. */
export interface StorageProvider {
  /**
   * Creates a short-lived URL that permits a client to upload one object.
   * The client must send the returned content type with its PUT request.
   */
  createPresignedUpload(input: PresignedUploadInput): Promise<PresignedUpload>;
}

export interface PresignedUploadInput {
  key: string;
  contentType: string;
  expiresIn?: number;
  metadata?: Record<string, string>;
}

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  expiresAt: Date;
  requiredHeaders: Record<string, string>;
}
