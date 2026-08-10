-- AlterEnum
ALTER TYPE "PdcaStage" ADD VALUE 'ACT';

-- CreateEnum
CREATE TYPE "SuggestionSourceType" AS ENUM ('ISSUE', 'METRIC_GAP', 'TASK', 'PROJECT');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('HEALTH_IMPROVEMENT', 'PROGRESS_ACCELERATION', 'TASK_RESOLUTION', 'RISK_MITIGATION', 'RESOURCE_OPTIMIZATION');

-- AlterEnum
BEGIN;
CREATE TYPE "SuggestionStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED', 'DEFERRED', 'EXPIRED');
ALTER TABLE "suggestion_detail" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "suggestion_detail" ALTER COLUMN "status" TYPE "SuggestionStatus_new" USING ("status"::text::"SuggestionStatus_new");
ALTER TYPE "SuggestionStatus" RENAME TO "SuggestionStatus_old";
ALTER TYPE "SuggestionStatus_new" RENAME TO "SuggestionStatus";
DROP TYPE "SuggestionStatus_old";
ALTER TABLE "suggestion_detail" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "WorkItemRelationType" ADD VALUE 'DERIVED_FROM';

-- AlterTable
ALTER TABLE "decision_detail" ADD COLUMN "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "decision_detail" ADD COLUMN "rationale" TEXT;
ALTER TABLE "decision_detail" ADD COLUMN "suggestion_id" TEXT;
ALTER TABLE "decision_detail" ALTER COLUMN "review_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "decision_detail_suggestion_id_idx" ON "decision_detail"("suggestion_id");

-- AlterTable
ALTER TABLE "suggestion_detail" ADD COLUMN "accepted_at" TIMESTAMP(3);
ALTER TABLE "suggestion_detail" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "suggestion_detail" ADD COLUMN "dedup_key" TEXT;
ALTER TABLE "suggestion_detail" ADD COLUMN "deferred_at" TIMESTAMP(3);
ALTER TABLE "suggestion_detail" ADD COLUMN "dismissed_at" TIMESTAMP(3);
ALTER TABLE "suggestion_detail" ADD COLUMN "evidence" JSONB;
ALTER TABLE "suggestion_detail" ADD COLUMN "expired_at" TIMESTAMP(3);
ALTER TABLE "suggestion_detail" ADD COLUMN "expires_at" TIMESTAMP(3);
ALTER TABLE "suggestion_detail" ADD COLUMN "impactScore" DOUBLE PRECISION;
ALTER TABLE "suggestion_detail" ADD COLUMN "source_ref_id" TEXT;
ALTER TABLE "suggestion_detail" ADD COLUMN "source_type" "SuggestionSourceType";
ALTER TABLE "suggestion_detail" ADD COLUMN "suggestion_type" "SuggestionType";
ALTER TABLE "suggestion_detail" ADD COLUMN "urgencyScore" DOUBLE PRECISION;

-- DropIndex
DROP INDEX "suggestion_detail_issue_id_idx";

-- CreateIndex
CREATE INDEX "suggestion_detail_dedup_key_idx" ON "suggestion_detail"("dedup_key");

-- CreateIndex
CREATE INDEX "suggestion_detail_expires_at_idx" ON "suggestion_detail"("expires_at");

-- CreateIndex
CREATE INDEX "suggestion_detail_source_type_source_ref_id_idx" ON "suggestion_detail"("source_type", "source_ref_id");
