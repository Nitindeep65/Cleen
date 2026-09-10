import assert from 'node:assert/strict';
import test from 'node:test';
import { cleaningRecordService } from '../src/services/cleaningRecord.service';
import { store } from '../src/store';

test.beforeEach(async () => {
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

  for (let index = 0; index < 5; index += 1) {
    await cleaningRecordService.create(
      'equipment-1',
      {
        cleanedBy: `operator-${index}`,
        cleanedAt: `2026-09-0${index + 1}T10:00:00.000Z`,
        method: 'Manual',
        status: index % 2 === 0 ? 'COMPLETED' : 'FAILED'
      },
      'system'
    );
  }
});

test('paginates filtered records and reports navigation metadata', async () => {
  const firstPage = await cleaningRecordService.listForEquipment('equipment-1', 1, 2, 'COMPLETED');
  assert.equal(firstPage.data.length, 2);
  assert.deepEqual(firstPage.pagination, {
    page: 1,
    limit: 2,
    total: 3,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false
  });

  const lastPage = await cleaningRecordService.listForEquipment('equipment-1', 2, 2, 'COMPLETED');
  assert.equal(lastPage.data.length, 1);
  assert.equal(lastPage.pagination.hasNextPage, false);
  assert.equal(lastPage.pagination.hasPreviousPage, true);
});

test('returns an empty page beyond the available data', async () => {
  const page = await cleaningRecordService.listForEquipment('equipment-1', 4, 2, 'FAILED');
  assert.deepEqual(page.data, []);
  assert.equal(page.pagination.total, 2);
  assert.equal(page.pagination.totalPages, 1);
  assert.equal(page.pagination.hasNextPage, false);
  assert.equal(page.pagination.hasPreviousPage, true);
});
