import * as argon2 from 'argon2';

/** Password hashing policy shared by every authentication entry point. */
export const passwordHashOptions: argon2.Options & { type: argon2.argon2id } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, passwordHashOptions);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try { return await argon2.verify(hash, password); } catch { return false; }
}
