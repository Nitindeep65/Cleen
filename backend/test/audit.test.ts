import assert from 'node:assert/strict';
import test from 'node:test';
import { cleaningRecordService } from '../src/services/cleaningRecord.service';
import { auditService } from '../src/services/audit.service';
import { store } from '../src/store';
import { calculateChanges } from '../src/utils/diffRecords';

test.beforeEach(() => {
  store.equipment.clear();
  store.cleaningRecords.clear();
  store.auditLogs.clear();
  store.equipment.set('equipment-1', {
    id: 'equipment-1',
    name: 'Reactor A',
    code: 'REACTOR-A-01',
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  });
});

test('calculateChanges records only changed fields', () => {
  const changes = calculateChanges(
    { status: 'IN_PROGRESS', method: 'Manual', notes: 'Initial' },
    { status: 'COMPLETED', method: 'CIP', notes: 'Initial' }
  );

  assert.deepEqual(changes, [
    { field: 'method', oldValue: 'Manual', newValue: 'CIP' },
    { field: 'status', oldValue: 'IN_PROGRESS', newValue: 'COMPLETED' }
  ]);
});

test('calculateChanges handles null transitions', () => {
  assert.deepEqual(calculateChanges({ notes: null }, { notes: 'Added' }), [
    { field: 'notes', oldValue: null, newValue: 'Added' }
  ]);
  assert.deepEqual(calculateChanges({ notes: 'Removed' }, { notes: null }), [
    { field: 'notes', oldValue: 'Removed', newValue: null }
  ]);
});

test('create records an audit entry from server-side record values', async () => {
  const record = await cleaningRecordService.create(
    'equipment-1',
    { cleanedBy: 'John', cleanedAt: '2026-09-02T10:00:00.000Z', method: 'Manual' },
    'operator-1'
  );

  const [entry] = await auditService.listForRecord(record.id);
  assert.equal(entry.changedBy, 'operator-1');
  assert.ok(entry.changedAt);
  assert.deepEqual(entry.changes, [
    { field: 'cleanedBy', oldValue: null, newValue: 'John' },
    { field: 'cleanedAt', oldValue: null, newValue: '2026-09-02T10:00:00.000Z' },
    { field: 'method', oldValue: null, newValue: 'Manual' },
    { field: 'status', oldValue: null, newValue: 'COMPLETED' }
  ]);
});

test('update records persisted old and new values and skips no-op updates', async () => {
  const record = await cleaningRecordService.create(
    'equipment-1',
    { cleanedBy: 'John', cleanedAt: '2026-09-02T10:00:00.000Z', method: 'Manual' },
    'operator-1'
  );

  await cleaningRecordService.update(record.id, { status: 'FAILED', method: 'CIP' }, 'operator-2');
  await cleaningRecordService.update(record.id, { status: 'FAILED', method: 'CIP' }, 'operator-3');

  const entries = await auditService.listForRecord(record.id);
  assert.equal(entries.length, 2);
  const updateEntry = entries.find((entry) => entry.changedBy === 'operator-2');
  assert.ok(updateEntry);
  assert.deepEqual(updateEntry.changes, [
    { field: 'method', oldValue: 'Manual', newValue: 'CIP' },
    { field: 'status', oldValue: 'COMPLETED', newValue: 'FAILED' }
  ]);
});
