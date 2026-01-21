import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

type CachedResponse = {
  status: number;
  body: unknown;
  headers: Record<string, string | number | readonly string[]>;
  timestamp: number;
};

const responseCache = new Map<string, CachedResponse>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function setResponseCache(key: string, res: Response, body: unknown) {
  const headers: Record<string, string | number | readonly string[]> = {};
  res.getHeaders();
  Object.entries(res.getHeaders()).forEach(([headerKey, value]) => {
    if (typeof value === 'number' || typeof value === 'string' || Array.isArray(value)) {
      headers[headerKey] = value;
    }
  });

  responseCache.set(key, {
    status: res.statusCode,
    body,
    headers,
    timestamp: Date.now(),
  });
}

function cleanupCache() {
  const now = Date.now();
  responseCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  });
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (
    req.method !== 'POST' ||
    req.path.startsWith('/api/webhooks') ||
    req.path.startsWith('/api/uploads')
  ) {
    return next();
  }

  const idempotencyKey = req.header(config.idempotencyHeader);
  if (!idempotencyKey) {
    return res.status(400).json({ message: 'Missing idempotency key' });
  }

  cleanupCache();
  req.idempotencyKey = idempotencyKey;

  const cached = responseCache.get(idempotencyKey);
  if (cached) {
    Object.entries(cached.headers).forEach(([headerKey, value]) => {
      res.setHeader(headerKey, value);
    });
    return res.status(cached.status).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 500) {
      setResponseCache(idempotencyKey, res, body);
    }
    return originalJson(body);
  };

  return next();
}
