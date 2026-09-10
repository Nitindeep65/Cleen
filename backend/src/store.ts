import { AuditLog, CleaningRecord, Equipment } from './types';

export const store = {
  equipment: new Map<string, Equipment>(),
  cleaningRecords: new Map<string, CleaningRecord>(),
  auditLogs: new Map<string, AuditLog>()
};
