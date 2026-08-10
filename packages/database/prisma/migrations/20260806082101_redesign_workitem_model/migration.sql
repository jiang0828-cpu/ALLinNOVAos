/*
  Warnings:

  - You are about to drop the column `actual_value` on the `goal_detail` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `goal_detail` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `goal_detail` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `goal_detail` table. All the data in the column will be lost.
  - You are about to drop the column `goal_id` on the `project_detail` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `project_detail` table. All the data in the column will be lost.
  - You are about to drop the column `assignee` on the `task_detail` table. All the data in the column will be lost.
  - You are about to drop the column `eta` on the `task_detail` table. All the data in the column will be lost.
  - You are about to drop the column `is_draft` on the `task_detail` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `task_detail` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `task_detail` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `work_items` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `work_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemType` to the `work_items` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `work_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('PLANNING', 'ACTIVE', 'TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PdcaStage" AS ENUM ('PLAN', 'DO');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'AI', 'IMPORT', 'API');

-- CreateEnum
CREATE TYPE "WorkItemRelationType" AS ENUM ('CONTAINS', 'SUPPORTS', 'DEPENDS_ON', 'BLOCKS');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ON_HOLD');

-- DropIndex
DROP INDEX "project_detail_goal_id_idx";

-- DropIndex
DROP INDEX "task_detail_project_id_idx";

-- DropIndex
DROP INDEX "work_items_type_status_idx";

-- DropIndex
DROP INDEX "work_items_workspace_id_idx";

-- AlterTable
ALTER TABLE "goal_detail" DROP COLUMN "actual_value",
DROP COLUMN "due_date",
DROP COLUMN "priority",
DROP COLUMN "start_date",
ADD COLUMN     "current_value" DOUBLE PRECISION,
ADD COLUMN     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "target_date" TIMESTAMP(3),
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "project_detail" DROP COLUMN "goal_id",
DROP COLUMN "summary",
ADD COLUMN     "actual_cost" DOUBLE PRECISION,
ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "health_status" "HealthStatus" NOT NULL DEFAULT 'ON_TRACK';

-- AlterTable
ALTER TABLE "task_detail" DROP COLUMN "assignee",
DROP COLUMN "eta",
DROP COLUMN "is_draft",
DROP COLUMN "priority",
DROP COLUMN "project_id",
ADD COLUMN     "actual_minutes" INTEGER,
ADD COLUMN     "completion_note" TEXT,
ADD COLUMN     "due_at" TIMESTAMP(3),
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "scheduled_end_at" TIMESTAMP(3),
ADD COLUMN     "scheduled_start_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "work_items" DROP COLUMN "type",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "cycle_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "domain_id" TEXT,
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "itemType" "WorkItemType" NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "pdcaStage" "PdcaStage" NOT NULL DEFAULT 'PLAN',
ADD COLUMN     "planned_end_at" TIMESTAMP(3),
ADD COLUMN     "planned_start_at" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
DROP COLUMN "status",
ADD COLUMN     "status" "WorkItemStatus" NOT NULL;

-- CreateTable
CREATE TABLE "work_item_relations" (
    "id" TEXT NOT NULL,
    "source_item_id" TEXT NOT NULL,
    "target_item_id" TEXT NOT NULL,
    "relation_type" "WorkItemRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_item_relations_target_item_id_idx" ON "work_item_relations"("target_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_relations_source_item_id_target_item_id_relation__key" ON "work_item_relations"("source_item_id", "target_item_id", "relation_type");

-- CreateIndex
CREATE INDEX "task_detail_due_at_idx" ON "task_detail"("due_at");

-- CreateIndex
CREATE INDEX "work_items_workspace_id_itemType_idx" ON "work_items"("workspace_id", "itemType");

-- CreateIndex
CREATE INDEX "work_items_workspace_id_status_idx" ON "work_items"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "work_items_domain_id_idx" ON "work_items"("domain_id");

-- CreateIndex
CREATE INDEX "work_items_cycle_id_idx" ON "work_items"("cycle_id");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "pdca_cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_item_relations" ADD CONSTRAINT "work_item_relations_source_item_id_fkey" FOREIGN KEY ("source_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_item_relations" ADD CONSTRAINT "work_item_relations_target_item_id_fkey" FOREIGN KEY ("target_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
