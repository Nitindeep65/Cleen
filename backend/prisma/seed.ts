import { PrismaClient, CleaningRecordStatus, EquipmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.cleaningRecord.deleteMany();
  await prisma.equipment.deleteMany();

  const reactor = await prisma.equipment.create({
    data: {
      name: 'Reactor A',
      code: 'REACTOR-A-01',
      status: EquipmentStatus.ACTIVE,
      cleaningRecords: {
        create: {
          cleanedBy: 'John Doe',
          cleanedAt: new Date('2026-09-01T10:00:00.000Z'),
          method: 'Manual',
          notes: 'Initial cleaning',
          status: CleaningRecordStatus.COMPLETED,
          auditLogs: {
            create: {
              changedBy: 'John Doe',
              changedAt: new Date('2026-09-01T10:05:00.000Z'),
              changes: [
                { field: 'cleanedBy', oldValue: null, newValue: 'John Doe' },
                { field: 'cleanedAt', oldValue: null, newValue: '2026-09-01T10:00:00.000Z' },
                { field: 'method', oldValue: null, newValue: 'Manual' },
                { field: 'notes', oldValue: null, newValue: 'Initial cleaning' },
                { field: 'status', oldValue: null, newValue: 'COMPLETED' }
              ]
            }
          }
        }
      }
    },
    include: { cleaningRecords: true }
  });

  await prisma.equipment.create({
    data: {
      name: 'Mixer B',
      code: 'MIXER-B-02',
      status: EquipmentStatus.MAINTENANCE
    }
  });

  console.log(`Seeded ${reactor.name} and related cleaning data.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
