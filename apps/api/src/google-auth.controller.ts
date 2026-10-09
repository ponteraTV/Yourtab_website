import { Body, Controller, ServiceUnavailableException, UnauthorizedException, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@vaultstream/database";
import { signAccessToken } from "@vaultstream/auth";

const cookieName = "vaultstream_session";

@Controller("v1/auth")
export class GoogleAuthController {
  @Post("google")
  async google(@Body() body: { credential?: string }, @Res({ passthrough: true }) response: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new ServiceUnavailableException("Google sign-in is not configured yet");
    if (!body?.credential || typeof body.credential !== "string") throw new UnauthorizedException("Missing Google credential");

    let claims: { aud?: string; sub?: string; email?: string; email_verified?: string | boolean; name?: string };
    try {
      const result = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(body.credential));
      if (!result.ok) throw new Error("Invalid Google token");
      claims = await result.json() as typeof claims;
    } catch {
      throw new UnauthorizedException("Google could not verify this sign-in. Please try again.");
    }

    if (claims.aud !== clientId || !claims.sub || !claims.email || !(claims.email_verified === true || claims.email_verified === "true")) {
      throw new UnauthorizedException("Google account verification failed");
    }

    const email = claims.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: String(claims.name || "").trim() || email.split("@")[0] || email,
          // This random password hash cannot be used as a Google sign-in substitute.
          passwordHash: await hash(randomUUID() + randomUUID(), 12),
        },
      });
    }
    if (user.status !== "ACTIVE") throw new UnauthorizedException("This account is not active");
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    response.cookie(cookieName, await signAccessToken({ id: user.id, email: user.email, role: user.role }), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, path: "/",
    });
    return { data: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
}
