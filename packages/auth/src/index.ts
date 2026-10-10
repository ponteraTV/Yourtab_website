import { SignJWT,jwtVerify } from "jose";
export type Role="USER"|"ADMIN"|"MODERATOR";
export interface AuthenticatedPrincipal{id:string;email:string;role:Role}
const key=()=>{const secret=process.env.JWT_SECRET;if(process.env.NODE_ENV==="production"&&(!secret||secret==="CHANGE_ME_IN_PRODUCTION"||secret.length<32))throw new Error("JWT_SECRET must be a random value of at least 32 characters in production");return new TextEncoder().encode(secret||"CHANGE_ME_IN_PRODUCTION")};
export const signAccessToken=(p:AuthenticatedPrincipal)=>new SignJWT({email:p.email,role:p.role}).setProtectedHeader({alg:"HS256"}).setSubject(p.id).setIssuedAt().setExpirationTime("15m").sign(key());
export async function verifyAccessToken(token:string){const {payload}=await jwtVerify(token,key());if(!payload.sub||typeof payload.email!=="string"||!["USER","ADMIN","MODERATOR"].includes(String(payload.role)))throw new Error("Invalid token");return{id:payload.sub,email:payload.email,role:payload.role as Role}}