import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors';

const allowedEquipmentStatuses = new Set(['ACTIVE', 'INACTIVE', 'MAINTENANCE']);
const allowedCleaningStatuses = new Set(['COMPLETED', 'IN_PROGRESS', 'FAILED']);

function requireObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, field: string, required = true): void {
  if (body[field] === undefined && !required) return;
  if (typeof body[field] !== 'string' || body[field].trim() === '') {
    throw new AppError(400, `${field} must be a non-empty string`);
  }
}

function rejectUnknownFields(body: Record<string, unknown>, allowedFields: Set<string>): void {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new AppError(400, `Unknown field: ${unknownFields[0]}`);
}

export const validateEquipmentBody: RequestHandler = (req, _res, next) => {
  try {
    const body = requireObject(req.body);
    const isPatch = req.method === 'PATCH';
    rejectUnknownFields(body, new Set(['name', 'code', 'status']));
    if (isPatch && Object.keys(body).length === 0) throw new AppError(400, 'Request body cannot be empty');
    requireString(body, 'name', !isPatch);
    requireString(body, 'code', !isPatch);
    requireString(body, 'status', false);
    if (body.status !== undefined && !allowedEquipmentStatuses.has(String(body.status))) {
      throw new AppError(400, 'status is invalid');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCleaningRecordBody: RequestHandler = (req, _res, next) => {
  try {
    const body = requireObject(req.body);
    const isPatch = req.method === 'PATCH';
    rejectUnknownFields(body, new Set(['cleanedBy', 'cleanedAt', 'method', 'notes', 'status']));
    if (isPatch && Object.keys(body).length === 0) throw new AppError(400, 'Request body cannot be empty');
    requireString(body, 'cleanedBy', !isPatch);
    requireString(body, 'cleanedAt', !isPatch);
    requireString(body, 'method', !isPatch);
    if (body.notes !== undefined && body.notes !== null) requireString(body, 'notes', false);
    requireString(body, 'status', false);
    if (body.status !== undefined && !allowedCleaningStatuses.has(String(body.status))) {
      throw new AppError(400, 'status is invalid');
    }
    if (body.cleanedAt !== undefined && Number.isNaN(Date.parse(String(body.cleanedAt)))) {
      throw new AppError(400, 'cleanedAt must be a valid date');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateEquipmentQuery: RequestHandler = (req, _res, next) => {
  try {
    if (req.query.status !== undefined && !allowedEquipmentStatuses.has(String(req.query.status))) {
      throw new AppError(400, 'status is invalid');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCleaningRecordQuery: RequestHandler = (req, _res, next) => {
  try {
    if (req.query.status !== undefined && !allowedCleaningStatuses.has(String(req.query.status))) {
      throw new AppError(400, 'status is invalid');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export function validateUuidParam(name: string): RequestHandler {
  return (req, _res, next) => {
    const value = String(req.params[name] ?? '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      next(new AppError(400, `${name} must be a valid UUID`));
      return;
    }
    next();
  };
}

export function parsePagination(req: Request): { page: number; limit: number } {
  if (req.query.pageSize !== undefined) throw new AppError(400, 'pageSize is unsupported; use limit');
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'page must be >= 1 and limit must be an integer from 1 to 100');
  }
  return { page, limit };
}
