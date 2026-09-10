import { CleaningRecord, FieldChange } from '../types';

const trackedFields: Array<keyof Pick<CleaningRecord, 'cleanedBy' | 'cleanedAt' | 'method' | 'notes' | 'status'>> = [
  'cleanedBy',
  'cleanedAt',
  'method',
  'notes',
  'status'
];

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  return JSON.stringify(left) === JSON.stringify(right);
}

export function calculateChanges(
  oldRecord: Partial<CleaningRecord> | null,
  newRecord: Partial<CleaningRecord>
): FieldChange[] {
  return trackedFields.flatMap((field) => {
    const oldValue = oldRecord?.[field] ?? null;
    const newValue = newRecord[field] ?? null;
    return valuesEqual(oldValue, newValue) ? [] : [{ field, oldValue, newValue }];
  });
}
