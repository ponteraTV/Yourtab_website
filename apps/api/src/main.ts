import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app=await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({origin:process.env.FRONTEND_URL||"http://localhost:3000",credentials:true,methods:["GET","HEAD","PUT","PATCH","POST","DELETE"]});
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:false,transform:true}));
  const port=Number(process.env.PORT||4000);
  await app.listen(port,"0.0.0.0");
  console.log(`VaultStream API listening on :${port}`);
}
bootstrap();
