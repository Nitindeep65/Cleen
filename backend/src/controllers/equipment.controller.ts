import { RequestHandler } from 'express';
import { equipmentService } from '../services/equipment.service';
import { parsePagination } from '../middleware/validation';

export const listEquipment: RequestHandler = async (req, res, next) => {
  try {
  const { page, limit } = parsePagination(req);
  const status = req.query.status as Parameters<typeof equipmentService.list>[2] | undefined;
    res.json(await equipmentService.list(page, limit, status));
  } catch (error) { next(error); }
};

export const getEquipment: RequestHandler = async (req, res, next) => {
  try { res.json(await equipmentService.getById(String(req.params.id))); } catch (error) { next(error); }
};

export const createEquipment: RequestHandler = async (req, res, next) => {
  try { res.status(201).json(await equipmentService.create(req.body)); } catch (error) { next(error); }
};

export const updateEquipment: RequestHandler = async (req, res, next) => {
  try { res.json(await equipmentService.update(String(req.params.id), req.body)); } catch (error) { next(error); }
};

export const deleteEquipment: RequestHandler = async (req, res, next) => {
  try { await equipmentService.delete(String(req.params.id)); res.status(204).send(); } catch (error) { next(error); }
};
