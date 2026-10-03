import Fastify from "fastify";
import type { StorageProvider } from "@yourtab/storage";

const MAX_UPLOAD_EXPIRY_SECONDS = 60 * 60;

export function buildApp(storage: StorageProvider) {
  const app = Fastify();

  app.post<{
    Body: { key: string; contentType: string; expiresIn?: number; metadata?: Record<string, string> };
  }>("/v1/uploads/presign", async (request, reply) => {
    const { key, contentType, expiresIn, metadata } = request.body ?? {};
    if (!key || !contentType) {
      return reply.code(400).send({ error: "key and contentType are required" });
    }
    if (key.startsWith("/") || key.includes("..")) {
      return reply.code(400).send({ error: "key must be a relative object key" });
    }
    if (expiresIn !== undefined && (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > MAX_UPLOAD_EXPIRY_SECONDS)) {
      return reply.code(400).send({ error: `expiresIn must be an integer between 1 and ${MAX_UPLOAD_EXPIRY_SECONDS}` });
    }

    const upload = await storage.createPresignedUpload({ key, contentType, expiresIn, metadata });
    return reply.code(201).send({ ...upload, expiresAt: upload.expiresAt.toISOString() });
  });

  return app;
}
