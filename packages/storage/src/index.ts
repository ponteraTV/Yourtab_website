import {S3Client,PutObjectCommand,HeadObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY || "",
  secretAccessKey: process.env.S3_SECRET_KEY || "",
};

export const storage = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "https://s3.amazonaws.com",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  credentials,
});

const bucket = () => process.env.S3_BUCKET || "vaultstream-media";

const presignStorage = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_PRESIGN_ENDPOINT || process.env.S3_ENDPOINT || "https://s3.amazonaws.com",
  forcePathStyle: process.env.S3_PRESIGN_FORCE_PATH_STYLE
    ? process.env.S3_PRESIGN_FORCE_PATH_STYLE !== "false"
    : process.env.S3_FORCE_PATH_STYLE !== "false",
  credentials,
});

export const presignPut = (key: string, type: string) =>
  getSignedUrl(
    presignStorage,
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: type }),
    { expiresIn: 900 },
  );

export async function objectExists(key: string) {
  try {
    await storage.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export const deleteObject = (key: string) =>
  storage.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).then(() => undefined);

export const publicUrl = (key: string) =>
  ((process.env.CDN_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "") + "/" + key);

export const storageBucket = () => bucket();
