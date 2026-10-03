import { Controller, Get } from "@nestjs/common";
@Controller("v1")
export class AppController { @Get("health") health() { return { data: { status: "ok", service: "vaultstream-api" } }; } }
