import { buildApp } from "./app.js";
import { createStorageProvider } from "./storage.js";

const app = buildApp(createStorageProvider());
const port = Number(process.env.PORT ?? 3000);

await app.listen({ port, host: process.env.HOST ?? "0.0.0.0" });
