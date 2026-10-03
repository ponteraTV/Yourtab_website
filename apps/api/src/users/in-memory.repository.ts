import { randomUUID } from 'node:crypto'; import { Injectable } from '@nestjs/common'; import { AuthToken, AuthTokenRepository, User, UserRepository } from './user.repository';
@Injectable() export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  async findByEmail(email: string) { return [...this.users.values()].find(u => u.email === email) ?? null; }
  async findById(id: string) { return this.users.get(id) ?? null; }
  async create(email: string, passwordHash: string) { const user: User={id:randomUUID(),email,passwordHash,emailVerifiedAt:null,createdAt:new Date()}; this.users.set(user.id,user); return user; }
  async markEmailVerified(userId: string) { const user=this.users.get(userId); if (user) user.emailVerifiedAt=new Date(); }
  async updatePassword(userId: string, passwordHash: string) { const user=this.users.get(userId); if (user) user.passwordHash=passwordHash; }
}
@Injectable() export class InMemoryAuthTokenRepository implements AuthTokenRepository {
 private tokens = new Map<string, AuthToken>();
 async create(token: Omit<AuthToken,'id'|'usedAt'>) { const saved={...token,id:randomUUID(),usedAt:null}; this.tokens.set(saved.id,saved); return saved; }
 async consume(hash: string, purpose: AuthToken['purpose']) { const token=[...this.tokens.values()].find(t=>t.tokenHash===hash&&t.purpose===purpose&&!t.usedAt&&t.expiresAt>new Date()); if (!token) return null; token.usedAt=new Date(); return token; }
}
@Injectable() export class NoopMailer { async sendVerification(_email: string, _token: string) {} async sendPasswordReset(_email: string, _token: string) {} }
