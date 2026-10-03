import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { InMemoryAuthTokenRepository, InMemoryUserRepository } from '../users/in-memory.repository';

test('registration verifies a user before it creates a JWT session', async () => {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const mailer = { sendVerification: jest.fn(), sendPasswordReset: jest.fn() };
  const service = new AuthService(users, tokens, mailer, new JwtService({ secret: 'test' }));

  const user = await service.register({ email: '  USER@example.COM ', password: 'Secure-password-9' });
  expect(user.email).toBe('user@example.com');
  await expect(service.login({ email: user.email, password: 'Secure-password-9' })).rejects.toThrow();

  await service.verifyEmail(mailer.sendVerification.mock.calls[0][1]);
  const session = await service.login({ email: user.email, password: 'Secure-password-9' });
  expect(await new JwtService({ secret: 'test' }).verifyAsync(session.accessToken)).toMatchObject({ sub: user.id });
});
