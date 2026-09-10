-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."EquipmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."CleaningRecordStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Equipment" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "public"."EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CleaningRecord" (
    "id" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "cleanedBy" TEXT NOT NULL,
    "cleanedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "status" "public"."CleaningRecordStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" UUID NOT NULL,
    "cleaningRecordId" UUID NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "public"."Equipment"("code");
CREATE INDEX "Equipment_status_idx" ON "public"."Equipment"("status");
CREATE INDEX "CleaningRecord_equipmentId_cleanedAt_idx" ON "public"."CleaningRecord"("equipmentId", "cleanedAt");
CREATE INDEX "CleaningRecord_equipmentId_status_cleanedAt_idx" ON "public"."CleaningRecord"("equipmentId", "status", "cleanedAt");
CREATE INDEX "AuditLog_cleaningRecordId_changedAt_idx" ON "public"."AuditLog"("cleaningRecordId", "changedAt");

-- AddForeignKey
ALTER TABLE "public"."CleaningRecord" ADD CONSTRAINT "CleaningRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_cleaningRecordId_fkey" FOREIGN KEY ("cleaningRecordId") REFERENCES "public"."CleaningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
