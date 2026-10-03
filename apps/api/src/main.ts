import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
async function bootstrap(): Promise<void> { const app = await NestFactory.create(AppModule); app.setGlobalPrefix("api"); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); app.enableCors({ origin: (process.env.APP_URL ?? "http://localhost:3000").split(","), credentials: true }); await app.listen(process.env.PORT ?? 4000, "0.0.0.0"); }
void bootstrap();

