# Yourtab website

## Phase 3 authentication

The Nest API exposes cookie-based JWT authentication through `apps/api`:

- `POST /auth/register` creates an account and sends a one-hour verification token.
- `POST /auth/verify-email` consumes the single-use verification token.
- `POST /auth/login` accepts verified users only and writes a 15-minute, HTTP-only `access_token` cookie.
- `POST /auth/logout` clears the authentication cookie; `GET /auth/me` requires it.
- `POST /auth/password-reset/request` always returns `202`, preventing account enumeration; `POST /auth/password-reset/confirm` consumes its single-use token.

Passwords are Argon2id hashes, and email/reset secrets are random 256-bit opaque tokens stored only as SHA-256 digests. The repository and mailer are ports so Phase 2's database and transactional mail provider can be bound in `AuthModule`. The included in-memory implementations are intentionally development-only placeholders and must be replaced by persistent adapters before deploying multiple API instances.

Copy `.env.example` and set `JWT_SECRET` to a cryptographically random value in production. Start locally with `npm install && npm run build && npm run start -w @yourtab/api`.
