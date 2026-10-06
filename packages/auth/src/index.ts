import { jwtVerify, SignJWT } from "jose";

export type Role = "USER" | "ADMIN" | "MODERATOR";
export interface AuthenticatedPrincipal { id: string; email: string; role: Role; }

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "development-only-change-me");

export async function signAccessToken(principal: AuthenticatedPrincipal) {
  return new SignJWT({ email: principal.email, role: principal.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(principal.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedPrincipal> {
  const { payload } = await jwtVerify(token, secret());
  if (!payload.sub || typeof payload.email !== "string" || !["USER","ADMIN","MODERATOR"].includes(String(payload.role))) {
    throw new Error("Invalid token");
  }
  return { id: payload.sub, email: payload.email, role: payload.role as Role };
}
