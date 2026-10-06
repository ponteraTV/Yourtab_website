import { SignJWT,jwtVerify } from "jose";
export type Role="USER"|"ADMIN"|"MODERATOR";
export interface AuthenticatedPrincipal{id:string;email:string;role:Role}
const key=()=>new TextEncoder().encode(process.env.JWT_SECRET||"CHANGE_ME_IN_PRODUCTION");
export const signAccessToken=(p:AuthenticatedPrincipal)=>new SignJWT({email:p.email,role:p.role}).setProtectedHeader({alg:"HS256"}).setSubject(p.id).setIssuedAt().setExpirationTime("15m").sign(key());
export async function verifyAccessToken(token:string){const {payload}=await jwtVerify(token,key());if(!payload.sub||typeof payload.email!=="string"||!["USER","ADMIN","MODERATOR"].includes(String(payload.role)))throw new Error("Invalid token");return{id:payload.sub,email:payload.email,role:payload.role as Role}}