import type { DbClient } from '../db/client';

declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

// API Response Envelope Types
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Helper Functions
export function success<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data
  };
}

export function failure(code: string, message: string, details?: unknown): ApiError {
  const error: ApiError = {
    success: false,
    error: {
      code,
      message
    }
  };
  
  if (details) {
    error.error.details = details;
  }
  
  return error;
}
