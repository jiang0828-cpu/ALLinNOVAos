/*
  Warnings:

  - You are about to drop the column `status` on the `task_detail` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "WorkItemStatus" ADD VALUE 'INBOX';

-- DropIndex
DROP INDEX "task_detail_status_idx";

-- AlterTable
ALTER TABLE "task_detail" DROP COLUMN "status";
