import { ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from '@yourtab/auth';
import { AUTH_TOKENS, AuthTokenRepository, MAILER, Mailer, USERS, User, UserRepository } from '../users/user.repository';

const TOKEN_TTL_MS = 60 * 60 * 1000;
@Injectable()
export class AuthService {
 constructor(@Inject(USERS) private readonly users: UserRepository, @Inject(AUTH_TOKENS) private readonly tokens: AuthTokenRepository, @Inject(MAILER) private readonly mailer: Mailer, private readonly jwt: JwtService) {}
 private email(email: string) { return email.trim().toLowerCase(); }
 private publicUser(user: User) { return { id:user.id, email:user.email, emailVerified:!!user.emailVerifiedAt }; }
 async register(input: {email:string; password:string}) { const email=this.email(input.email); if (await this.users.findByEmail(email)) throw new ConflictException('An account already exists for this email'); const user=await this.users.create(email, await hashPassword(input.password)); await this.issueToken(user, 'verify-email'); return this.publicUser(user); }
 async login(input: {email:string; password:string}) { const user=await this.users.findByEmail(this.email(input.email)); if (!user || !(await verifyPassword(user.passwordHash,input.password))) throw new UnauthorizedException('Invalid email or password'); if (!user.emailVerifiedAt) throw new ForbiddenException('Verify your email before logging in'); return { user:this.publicUser(user), accessToken:await this.jwt.signAsync({sub:user.id,email:user.email}) }; }
 async verifyEmail(token: string) { const authToken=await this.tokens.consume(hashToken(token),'verify-email'); if (!authToken) throw new UnauthorizedException('Verification link is invalid or expired'); await this.users.markEmailVerified(authToken.userId); }
 async requestPasswordReset(email: string) { const user=await this.users.findByEmail(this.email(email)); if (user) await this.issueToken(user,'reset-password'); }
 async resetPassword(token: string, password: string) { const authToken=await this.tokens.consume(hashToken(token),'reset-password'); if (!authToken) throw new UnauthorizedException('Password reset link is invalid or expired'); await this.users.updatePassword(authToken.userId,await hashPassword(password)); }
 async me(userId: string) { const user=await this.users.findById(userId); if (!user) throw new UnauthorizedException(); return this.publicUser(user); }
 private async issueToken(user: User, purpose: 'verify-email'|'reset-password') { const token=createOpaqueToken(); await this.tokens.create({userId:user.id,purpose,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+TOKEN_TTL_MS)}); if (purpose==='verify-email') await this.mailer.sendVerification(user.email,token); else await this.mailer.sendPasswordReset(user.email,token); }
}
