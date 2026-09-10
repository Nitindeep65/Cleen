import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../errors';
import { prisma, useMemoryStore } from '../prisma';
import { store } from '../store';
import { CleaningRecord, CleaningRecordStatus, Page } from '../types';
import { calculateChanges } from '../utils/diffRecords';
import { auditService } from './audit.service';

export interface CleaningRecordInput {
  cleanedBy: string;
  cleanedAt: string;
  method: string;
  notes?: string | null;
  status?: CleaningRecordStatus;
}

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function toCleaningRecord(value: { id: string; equipmentId: string; cleanedBy: string; cleanedAt: Date; method: string; notes: string | null; status: CleaningRecordStatus; createdAt: Date; updatedAt: Date }): CleaningRecord {
  return { ...value, cleanedAt: value.cleanedAt.toISOString(), createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString() };
}

export class CleaningRecordService {
  async listForEquipment(equipmentId: string, page: number, limit: number, status?: CleaningRecordStatus): Promise<Page<CleaningRecord>> {
    if (useMemoryStore) {
      await this.ensureEquipment(equipmentId);
      const records = [...store.cleaningRecords.values()]
        .filter((record) => record.equipmentId === equipmentId && (!status || record.status === status))
        .sort((left, right) => right.cleanedAt.localeCompare(left.cleanedAt) || right.id.localeCompare(left.id));
      return this.paginate(records, page, limit);
    }
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
    if (!equipment) throw new AppError(404, 'Equipment not found');
    const where = { equipmentId, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      prisma.cleaningRecord.findMany({ where, orderBy: [{ cleanedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.cleaningRecord.count({ where })
    ]);
    return this.paginate(items.map(toCleaningRecord), page, limit, total, true);
  }

  async getById(id: string): Promise<CleaningRecord> {
    if (useMemoryStore) {
      const record = store.cleaningRecords.get(id);
      if (!record) throw new AppError(404, 'Cleaning record not found');
      return record;
    }
    const record = await prisma.cleaningRecord.findUnique({ where: { id } });
    if (!record) throw new AppError(404, 'Cleaning record not found');
    return toCleaningRecord(record);
  }

  async create(equipmentId: string, input: CleaningRecordInput, changedBy: string): Promise<CleaningRecord> {
    if (useMemoryStore) {
      await this.ensureEquipment(equipmentId);
      const now = new Date().toISOString();
      const record: CleaningRecord = { id: randomUUID(), equipmentId, cleanedBy: input.cleanedBy, cleanedAt: input.cleanedAt, method: input.method, notes: input.notes, status: input.status ?? 'COMPLETED', createdAt: now, updatedAt: now };
      store.cleaningRecords.set(record.id, record);
      await auditService.createAuditEntry({ cleaningRecordId: record.id, changedBy, changes: calculateChanges(null, record) });
      return record;
    }
    try {
      return await prisma.$transaction(async (transaction) => {
        const equipment = await transaction.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
        if (!equipment) throw new AppError(404, 'Equipment not found');
        const created = await transaction.cleaningRecord.create({ data: { equipmentId, cleanedBy: input.cleanedBy, cleanedAt: new Date(input.cleanedAt), method: input.method, notes: input.notes, status: input.status } });
        const record = toCleaningRecord(created);
        await auditService.createAuditEntry({ cleaningRecordId: record.id, changedBy, changes: calculateChanges(null, record) }, transaction);
        return record;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  async update(id: string, input: Partial<CleaningRecordInput>, changedBy: string): Promise<CleaningRecord> {
    if (useMemoryStore) {
      const record = await this.getById(id);
      const recordFields: Partial<Pick<CleaningRecord, 'cleanedBy' | 'cleanedAt' | 'method' | 'notes' | 'status'>> = {
        ...(input.cleanedBy !== undefined ? { cleanedBy: input.cleanedBy } : {}), ...(input.cleanedAt !== undefined ? { cleanedAt: input.cleanedAt } : {}), ...(input.method !== undefined ? { method: input.method } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), ...(input.status !== undefined ? { status: input.status } : {})
      };
      const updated = { ...record, ...recordFields, updatedAt: new Date().toISOString() };
      store.cleaningRecords.set(id, updated);
      const changes = calculateChanges(record, updated);
      if (changes.length > 0) await auditService.createAuditEntry({ cleaningRecordId: id, changedBy, changes });
      return updated;
    }
    return prisma.$transaction(async (transaction) => {
      const oldRecord = await transaction.cleaningRecord.findUnique({ where: { id } });
      if (!oldRecord) throw new AppError(404, 'Cleaning record not found');
      const updated = await transaction.cleaningRecord.update({
        where: { id },
        data: {
          ...(input.cleanedBy !== undefined ? { cleanedBy: input.cleanedBy } : {}), ...(input.cleanedAt !== undefined ? { cleanedAt: new Date(input.cleanedAt) } : {}), ...(input.method !== undefined ? { method: input.method } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), ...(input.status !== undefined ? { status: input.status } : {})
        }
      });
      const oldValue = toCleaningRecord(oldRecord);
      const newValue = toCleaningRecord(updated);
      const changes = calculateChanges(oldValue, newValue);
      if (changes.length > 0) await auditService.createAuditEntry({ cleaningRecordId: id, changedBy, changes }, transaction);
      return newValue;
    });
  }

  async listAudit(id: string) {
    await this.getById(id);
    return auditService.listForRecord(id);
  }

  private async ensureEquipment(id: string): Promise<void> {
    if (!store.equipment.has(id)) throw new AppError(404, 'Equipment not found');
  }

  private paginate(records: CleaningRecord[], page: number, limit: number, total = records.length, alreadyPaged = false): Page<CleaningRecord> {
    const totalPages = Math.ceil(total / limit);
    const start = useMemoryStore ? (page - 1) * limit : 0;
    return { data: alreadyPaged ? records : records.slice(start, start + limit), pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
  }
}

export const cleaningRecordService = new CleaningRecordService();
