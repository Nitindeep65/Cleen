import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: { message: 'Request body contains invalid JSON' } });
    return;
  }
  const appError = error instanceof AppError ? error : new AppError(500, 'Internal server error');
  res.status(appError.statusCode).json({
    error: { message: appError.message, ...(appError.details ? { details: appError.details } : {}) }
  });
};
