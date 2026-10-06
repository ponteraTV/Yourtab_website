import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageProvider { exists(key: string): Promise<boolean>; delete(key: string): Promise<void>; }

export const storage = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const bucket = () => process.env.S3_BUCKET ?? "vaultstream-media";

export async function presignPut(key: string, contentType: string, expiresIn = 900) {
  return getSignedUrl(storage, new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn });
}
export async function objectExists(key: string) {
  try { await storage.send(new HeadObjectCommand({ Bucket: bucket(), Key: key })); return true; }
  catch { return false; }
}
export async function deleteObject(key: string) {
  await storage.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
export function publicUrl(key: string) {
  const base = process.env.CDN_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || "";
  return base ? base.replace(/\/$/, "") + "/" + key : key;
}
export function storageBucket() { return bucket(); }
