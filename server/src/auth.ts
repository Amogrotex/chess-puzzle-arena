import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { users, type UserRow } from './db.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    handle: u.handle,
    rating: u.rating,
    isGuest: !!u.is_guest,
    country: u.country,
    avatar: u.avatar,
    createdAt: u.created_at,
  };
}

export function signToken(u: UserRow): string {
  return jwt.sign({ sub: u.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

const GUEST_ADJECTIVES = ['Swift', 'Quiet', 'Bold', 'Clever', 'Silent', 'Sharp', 'Lucky', 'Iron'];
const GUEST_NOUNS = ['Knight', 'Bishop', 'Rook', 'Pawn', 'Queen', 'Gambit', 'Tactician', 'Endgame'];

export function createGuest(): UserRow {
  const id = randomUUID();
  const name = `${GUEST_ADJECTIVES[(Math.random() * GUEST_ADJECTIVES.length) | 0]}${
    GUEST_NOUNS[(Math.random() * GUEST_NOUNS.length) | 0]
  }${100 + ((Math.random() * 900) | 0)}`;
  const handle = `${name.toLowerCase()}_${id.slice(0, 4)}`;
  const row: UserRow = {
    id,
    username: name,
    handle,
    email: null,
    password_hash: null,
    is_guest: 1,
    rating: 1200,
    country: null,
    avatar: null,
    created_at: Date.now(),
  };
  users.insert.run(row);
  return row;
}

export function createUser(input: {
  username: string;
  email: string;
  password: string;
  country?: string | null;
}): UserRow {
  const handle = input.username.toLowerCase();
  const row: UserRow = {
    id: randomUUID(),
    username: input.username,
    handle,
    email: input.email.toLowerCase(),
    password_hash: bcrypt.hashSync(input.password, 10),
    is_guest: 0,
    rating: 1200,
    country: input.country ?? null,
    avatar: null,
    created_at: Date.now(),
  };
  users.insert.run(row);
  return row;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  if (!user.password_hash) return false;
  return bcrypt.compareSync(password, user.password_hash);
}

/** Attaches req.user when a valid bearer token is present. Never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
      if (payload.sub) {
        const user = users.byId.get(payload.sub);
        if (user) req.user = user;
      }
    } catch {
      /* invalid / expired token -> continue as anonymous */
    }
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized', message: 'Sign in (or start a guest session) first.' });
    return;
  }
  next();
}
