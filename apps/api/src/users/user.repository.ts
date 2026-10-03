export type User = { id: string; email: string; passwordHash: string; emailVerifiedAt: Date | null; createdAt: Date };
export type AuthToken = { id: string; userId: string; purpose: 'verify-email' | 'reset-password'; tokenHash: string; expiresAt: Date; usedAt: Date | null };
export interface UserRepository { findByEmail(email: string): Promise<User | null>; findById(id: string): Promise<User | null>; create(email: string, passwordHash: string): Promise<User>; markEmailVerified(userId: string): Promise<void>; updatePassword(userId: string, passwordHash: string): Promise<void>; }
export interface AuthTokenRepository { create(token: Omit<AuthToken, 'id' | 'usedAt'>): Promise<AuthToken>; consume(hash: string, purpose: AuthToken['purpose']): Promise<AuthToken | null>; }
export const USERS = Symbol('USERS'); export const AUTH_TOKENS = Symbol('AUTH_TOKENS'); export const MAILER = Symbol('MAILER');
export interface Mailer { sendVerification(email: string, token: string): Promise<void>; sendPasswordReset(email: string, token: string): Promise<void>; }
