import test from 'node:test'; import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password'; import { createOpaqueToken, hashToken, tokensMatch } from './token';
test('passwords use a non-reversible argon2id hash', async () => { const hash = await hashPassword('Correct-horse-7'); assert.match(hash, /^\$argon2id\$/); assert.equal(await verifyPassword(hash, 'Correct-horse-7'), true); assert.equal(await verifyPassword(hash, 'wrong'), false); });
test('opaque tokens verify only their digest', () => { const token = createOpaqueToken(); assert.equal(tokensMatch(hashToken(token), token), true); assert.equal(tokensMatch(hashToken(token), 'other'), false); });
