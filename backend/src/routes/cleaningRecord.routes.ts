import { Router } from 'express';
import {
  createCleaningRecord,
  getCleaningRecord,
  listAudit,
  listForEquipment,
  updateCleaningRecord
} from '../controllers/cleaningRecord.controller';
import { validateCleaningRecordBody, validateCleaningRecordQuery, validateUuidParam } from '../middleware/validation';

export const cleaningRecordRouter = Router();

cleaningRecordRouter.get('/equipment/:equipmentId/cleaning-records', validateUuidParam('equipmentId'), validateCleaningRecordQuery, listForEquipment);
cleaningRecordRouter.post('/equipment/:equipmentId/cleaning-records', validateUuidParam('equipmentId'), validateCleaningRecordBody, createCleaningRecord);
cleaningRecordRouter.get('/cleaning-records/:id', validateUuidParam('id'), getCleaningRecord);
cleaningRecordRouter.patch('/cleaning-records/:id', validateUuidParam('id'), validateCleaningRecordBody, updateCleaningRecord);
cleaningRecordRouter.get('/cleaning-records/:id/audit', validateUuidParam('id'), listAudit);
