import { Router } from 'express';
import {
  createEquipment,
  deleteEquipment,
  getEquipment,
  listEquipment,
  updateEquipment
} from '../controllers/equipment.controller';
import { validateEquipmentBody, validateEquipmentQuery, validateUuidParam } from '../middleware/validation';

export const equipmentRouter = Router();

equipmentRouter.get('/', validateEquipmentQuery, listEquipment);
equipmentRouter.get('/:id', validateUuidParam('id'), getEquipment);
equipmentRouter.post('/', validateEquipmentBody, createEquipment);
equipmentRouter.patch('/:id', validateUuidParam('id'), validateEquipmentBody, updateEquipment);
equipmentRouter.delete('/:id', validateUuidParam('id'), deleteEquipment);
