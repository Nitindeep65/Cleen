import { randomUUID } from 'node:crypto';
import { AppError } from '../errors';
import { prisma, useMemoryStore } from '../prisma';
import { store } from '../store';
import { Equipment, EquipmentStatus, Page } from '../types';

export interface EquipmentInput {
  name: string;
  code: string;
  status?: EquipmentStatus;
}

function toEquipment(value: { id: string; name: string; code: string; status: EquipmentStatus; createdAt: Date; updatedAt: Date }): Equipment {
  return { ...value, createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString() };
}

export class EquipmentService {
  async list(page: number, limit: number, status?: EquipmentStatus): Promise<Page<Equipment>> {
    if (useMemoryStore) {
      const filtered = [...store.equipment.values()]
        .filter((item) => !status || item.status === status)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      return this.page(filtered, page, limit);
    }
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.equipment.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      prisma.equipment.count({ where })
    ]);
    return this.page(items.map(toEquipment), page, limit, total, true);
  }

  async getById(id: string): Promise<Equipment> {
    if (useMemoryStore) {
      const equipment = store.equipment.get(id);
      if (!equipment) throw new AppError(404, 'Equipment not found');
      return equipment;
    }
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new AppError(404, 'Equipment not found');
    return toEquipment(equipment);
  }

  async create(input: EquipmentInput): Promise<Equipment> {
    try {
      if (useMemoryStore) {
        if ([...store.equipment.values()].some((item) => item.code === input.code)) throw new AppError(409, 'Equipment code must be unique');
        const now = new Date().toISOString();
        const equipment: Equipment = { id: randomUUID(), name: input.name, code: input.code, status: input.status ?? 'ACTIVE', createdAt: now, updatedAt: now };
        store.equipment.set(equipment.id, equipment);
        return equipment;
      }
      return toEquipment(await prisma.equipment.create({ data: { name: input.name, code: input.code, status: input.status } }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (String(error).includes('Unique constraint')) throw new AppError(409, 'Equipment code must be unique');
      throw error;
    }
  }

  async update(id: string, input: Partial<EquipmentInput>): Promise<Equipment> {
    try {
      if (useMemoryStore) {
        const equipment = await this.getById(id);
        if (input.code && input.code !== equipment.code && [...store.equipment.values()].some((item) => item.code === input.code)) throw new AppError(409, 'Equipment code must be unique');
        const updated = { ...equipment, ...input, updatedAt: new Date().toISOString() };
        store.equipment.set(id, updated);
        return updated;
      }
      return toEquipment(await prisma.equipment.update({ where: { id }, data: input }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (String(error).includes('Record to update not found')) throw new AppError(404, 'Equipment not found');
      if (String(error).includes('Unique constraint')) throw new AppError(409, 'Equipment code must be unique');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (useMemoryStore) {
        await this.getById(id);
        if ([...store.cleaningRecords.values()].some((record) => record.equipmentId === id)) throw new AppError(409, 'Equipment with cleaning records cannot be deleted');
        store.equipment.delete(id);
        return;
      }
      await prisma.equipment.delete({ where: { id } });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (String(error).includes('Record to delete does not exist')) throw new AppError(404, 'Equipment not found');
      if (String(error).includes('Foreign key constraint')) throw new AppError(409, 'Equipment with cleaning records cannot be deleted');
      throw error;
    }
  }

  private page(items: Equipment[], page: number, limit: number, total = items.length, alreadyPaged = false): Page<Equipment> {
    const totalPages = Math.ceil(total / limit);
    return { data: alreadyPaged ? items : items.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
  }
}

export const equipmentService = new EquipmentService();
