/**
 * Authentication utilities for JWT and API keys
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload, AuthenticationError } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

export function generateJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION } as jwt.SignOptions);
}

export function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

export function generateAPIKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function verifyAPIKey(key: string, hash: string): boolean {
  return hashAPIKey(key) === hash;
}

export function authMiddleware() {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [type, token] = authHeader.split(' ');

    try {
      if (type === 'Bearer') {
        req.user = verifyJWT(token);
      } else if (type === 'ApiKey') {
        req.apiKey = token;
      } else {
        throw new AuthenticationError('Invalid authorization type');
      }
      next();
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  };
}

export function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !req.user.roles || !req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
