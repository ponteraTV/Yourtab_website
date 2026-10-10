import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // Allow multiple frontend origins (Cloudflare Pages and Workers) while
  // preserving credentialed requests for cookie-based authentication.
  const allowedOrigins = new Set(
    [
      process.env.FRONTEND_URLS,
      process.env.FRONTEND_URL,
      "https://yourtab.pages.dev",
      "https://yourtab-website.yourtab.workers.dev",
      "https://yourtab.yourtab.workers.dev",
      "http://localhost:3000",
    ]
      .filter(Boolean)
      .flatMap((value) => value!.split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Requests without an Origin header (e.g. server-to-server health checks)
      // are not browser CORS requests and should remain allowed.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(Number(process.env.PORT || 4000), "0.0.0.0");
}

bootstrap();
