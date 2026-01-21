export class AppError extends Error {
  constructor(public statusCode: number, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertCondition(condition: boolean, status: number, message: string) {
  if (!condition) {
    throw new AppError(status, message);
  }
}
