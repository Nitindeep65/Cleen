import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma, useMemoryStore } from '../prisma';
import { store } from '../store';
import { AuditLog, FieldChange } from '../types';

export interface CreateAuditEntryInput {
  cleaningRecordId: string;
  changedBy: string;
  changes: FieldChange[];
  changedAt?: Date;
}

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function toAuditLog(value: { id: string; cleaningRecordId: string; changedBy: string; changedAt: Date; changes: Prisma.JsonValue }): AuditLog {
  return { id: value.id, cleaningRecordId: value.cleaningRecordId, changedBy: value.changedBy, changedAt: value.changedAt.toISOString(), changes: value.changes as unknown as FieldChange[] };
}

export class AuditService {
  async createAuditEntry(input: CreateAuditEntryInput, database: DatabaseClient = prisma): Promise<AuditLog> {
    if (useMemoryStore) {
      const entry: AuditLog = { id: randomUUID(), cleaningRecordId: input.cleaningRecordId, changedBy: input.changedBy, changedAt: (input.changedAt ?? new Date()).toISOString(), changes: input.changes };
      store.auditLogs.set(entry.id, entry);
      return entry;
    }
    return toAuditLog(await database.auditLog.create({ data: { cleaningRecordId: input.cleaningRecordId, changedBy: input.changedBy, changedAt: input.changedAt, changes: input.changes as unknown as Prisma.InputJsonValue } }));
  }

  async listForRecord(cleaningRecordId: string): Promise<AuditLog[]> {
    if (useMemoryStore) {
      return [...store.auditLogs.values()]
        .filter((entry) => entry.cleaningRecordId === cleaningRecordId)
        .sort((left, right) => left.changedAt.localeCompare(right.changedAt) || left.id.localeCompare(right.id));
    }
    const entries = await prisma.auditLog.findMany({ where: { cleaningRecordId }, orderBy: [{ changedAt: 'asc' }, { id: 'asc' }] });
    return entries.map(toAuditLog);
  }
}

export const auditService = new AuditService();
