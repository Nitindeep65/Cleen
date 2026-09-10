import type { AuditLog, CleaningRecord, CleaningRecordInput, CleaningRecordStatus, Equipment, EquipmentStatus, Page } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const allowMockFallback = import.meta.env.DEV && import.meta.env.VITE_DISABLE_MOCK !== 'true';

export class ApiError extends Error { constructor(message: string, readonly status?: number) { super(message); this.name = 'ApiError'; } }
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) { let message = `Request failed (${response.status})`; try { const body = await response.json() as { error?: { message?: string } }; message = body.error?.message ?? message; } catch { /* non-JSON error */ } throw new ApiError(message, response.status); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const seedEquipment: Equipment[] = [
  { id: 'mock-reactor-a', name: 'Reactor A', code: 'REACTOR-A-01', status: 'ACTIVE', createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
  { id: 'mock-mixer-b', name: 'Mixer B', code: 'MIXER-B-02', status: 'MAINTENANCE', createdAt: '2026-09-02T08:00:00Z', updatedAt: '2026-09-02T08:00:00Z' },
];
const seedRecords: CleaningRecord[] = [{ id: 'mock-record-1', equipmentId: 'mock-reactor-a', cleanedBy: 'John Doe', cleanedAt: '2026-09-01T10:00:00Z', method: 'Manual', notes: 'Initial cleaning', status: 'COMPLETED', createdAt: '2026-09-01T10:05:00Z', updatedAt: '2026-09-01T10:05:00Z' }];
const seedAudit: AuditLog[] = [{ id: 'mock-audit-1', cleaningRecordId: 'mock-record-1', changedBy: 'John Doe', changedAt: '2026-09-01T10:05:00Z', changes: [{ field: 'cleanedBy', oldValue: null, newValue: 'John Doe' }, { field: 'method', oldValue: null, newValue: 'Manual' }, { field: 'status', oldValue: null, newValue: 'COMPLETED' }] }];
let mockEquipment = [...seedEquipment]; let mockRecords = [...seedRecords]; let mockAudit = [...seedAudit];
const mockPage = <T,>(items: T[], page: number, limit: number): Page<T> => ({ data: items.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit), hasNextPage: page * limit < items.length, hasPreviousPage: page > 1 } });
const fallback = async <T>(operation: () => T, error: unknown): Promise<T> => {
  if (!allowMockFallback || error instanceof ApiError) throw error;
  return operation();
};

export const api = {
  async listEquipment(status?: EquipmentStatus): Promise<Page<Equipment>> { try { return await request<Page<Equipment>>(`/equipment${status ? `?status=${status}` : ''}`); } catch (error) { return fallback(() => mockPage(mockEquipment.filter((item) => !status || item.status === status), 1, 100), error); } },
  async listRecords(equipmentId: string, page: number, limit: number, status?: CleaningRecordStatus): Promise<Page<CleaningRecord>> { try { const query = new URLSearchParams({ page: String(page), limit: String(limit) }); if (status) query.set('status', status); return await request<Page<CleaningRecord>>(`/equipment/${equipmentId}/cleaning-records?${query}`); } catch (error) { return fallback(() => mockPage(mockRecords.filter((item) => item.equipmentId === equipmentId && (!status || item.status === status)), page, limit), error); } },
  async getRecord(id: string): Promise<CleaningRecord> { try { return await request<CleaningRecord>(`/cleaning-records/${id}`); } catch (error) { return fallback(() => mockRecords.find((item) => item.id === id) ?? (() => { throw new ApiError('Cleaning record not found', 404); })(), error); } },
  async saveRecord(equipmentId: string, input: CleaningRecordInput, id?: string): Promise<CleaningRecord> {
    return request<CleaningRecord>(id ? `/cleaning-records/${id}` : `/equipment/${equipmentId}/cleaning-records`, { method: id ? 'PATCH' : 'POST', headers: { 'x-user-id': 'operations-user' }, body: JSON.stringify(input) });
  },
  async audit(id: string): Promise<AuditLog[]> { try { return await request<AuditLog[]>(`/cleaning-records/${id}/audit`); } catch (error) { return fallback(() => mockAudit.filter((item) => item.cleaningRecordId === id), error); } },
};