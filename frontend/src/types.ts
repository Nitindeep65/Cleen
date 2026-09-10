export type EquipmentStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type CleaningRecordStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';

export interface Equipment { id: string; name: string; code: string; status: EquipmentStatus; createdAt: string; updatedAt: string; }
export interface CleaningRecord { id: string; equipmentId: string; cleanedBy: string; cleanedAt: string; method: string; notes?: string | null; status: CleaningRecordStatus; createdAt: string; updatedAt: string; }
export interface FieldChange { field: string; oldValue: unknown; newValue: unknown; }
export interface AuditLog { id: string; cleaningRecordId: string; changedBy: string; changedAt: string; changes: FieldChange[]; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }
export interface Page<T> { data: T[]; pagination: Pagination; }
export interface CleaningRecordInput { cleanedBy: string; cleanedAt: string; method: string; notes?: string; status: CleaningRecordStatus; }