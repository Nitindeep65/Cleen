import { RequestHandler } from 'express';
import { cleaningRecordService } from '../services/cleaningRecord.service';
import { parsePagination } from '../middleware/validation';

function changedBy(req: Parameters<RequestHandler>[0]): string {
  return process.env.NODE_ENV === 'production' ? 'system' : String(req.header('x-user-id') || 'system');
}

export const listForEquipment: RequestHandler = async (req, res, next) => {
  try {
  const { page, limit } = parsePagination(req);
  const status = req.query.status as Parameters<typeof cleaningRecordService.listForEquipment>[3] | undefined;
    res.json(await cleaningRecordService.listForEquipment(String(req.params.equipmentId), page, limit, status));
  } catch (error) { next(error); }
};

export const createCleaningRecord: RequestHandler = async (req, res, next) => {
  try { res.status(201).json(await cleaningRecordService.create(String(req.params.equipmentId), req.body, changedBy(req))); } catch (error) { next(error); }
};

export const getCleaningRecord: RequestHandler = async (req, res, next) => {
  try { res.json(await cleaningRecordService.getById(String(req.params.id))); } catch (error) { next(error); }
};

export const updateCleaningRecord: RequestHandler = async (req, res, next) => {
  try { res.json(await cleaningRecordService.update(String(req.params.id), req.body, changedBy(req))); } catch (error) { next(error); }
};

export const listAudit: RequestHandler = async (req, res, next) => {
  try { res.json(await cleaningRecordService.listAudit(String(req.params.id))); } catch (error) { next(error); }
};
