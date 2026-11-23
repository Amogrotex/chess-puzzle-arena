import { Router } from 'express';
import { z } from 'zod';
import { createGuest, createUser, publicUser, requireUser, signToken, verifyPassword } from '../auth.js';
import { users } from '../db.js';

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'letters, numbers, _ and - only'),
  email: z.string().trim().email(),
  password: z.string().min(6).max(72),
});

authRouter.post('/guest', (_req, res) => {
  const user = createGuest();
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const { username, email, password } = parsed.data;
  if (users.byHandle.get(username.toLowerCase())) {
    res.status(409).json({ error: 'username-taken', message: 'That username is already taken.' });
    return;
  }
  if (users.byEmail.get(email.toLowerCase())) {
    res.status(409).json({ error: 'email-taken', message: 'That email is already registered.' });
    return;
  }
  const user = createUser({ username, email, password });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = users.byHandle.get(username) ?? users.byEmail.get(username);
  if (!user || user.is_guest || !verifyPassword(user, password)) {
    res.status(401).json({ error: 'invalid-credentials', message: 'Wrong username or password.' });
    return;
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireUser, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});
