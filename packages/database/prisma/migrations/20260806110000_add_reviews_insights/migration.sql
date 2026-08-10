-- AlterEnum
ALTER TYPE "PdcaStage" ADD VALUE 'REVIEW';

-- AlterEnum
ALTER TYPE "WorkItemRelationType" ADD VALUE 'REVIEWS';
ALTER TYPE "WorkItemRelationType" ADD VALUE 'EVALUATES';
ALTER TYPE "WorkItemRelationType" ADD VALUE 'PRODUCES';
ALTER TYPE "WorkItemRelationType" ADD VALUE 'LEARNED_FROM';
ALTER TYPE "WorkItemRelationType" ADD VALUE 'APPLIES_TO';
ALTER TYPE "WorkItemRelationType" ADD VALUE 'ADJUSTS';

-- AlterEnum for ReviewStatus (replace enum to add COMPLETED)
BEGIN;
CREATE TYPE "ReviewStatus_new" AS ENUM ('DRAFT', 'COMPLETED', 'PUBLISHED', 'ARCHIVED');
ALTER TABLE "review_detail" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "review_detail" ALTER COLUMN "status" TYPE "ReviewStatus_new" USING ("status"::text::"ReviewStatus_new");
ALTER TYPE "ReviewStatus" RENAME TO "ReviewStatus_old";
ALTER TYPE "ReviewStatus_new" RENAME TO "ReviewStatus";
DROP TYPE "ReviewStatus_old";
ALTER TABLE "review_detail" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'PROJECT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('SUCCESS_FACTOR', 'FAILURE_PATTERN', 'HABIT_PATTERN', 'RISK_PATTERN', 'OPTIMIZATION', 'STRATEGY');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable: review_detail
ALTER TABLE "review_detail" ADD COLUMN "review_type" "ReviewType" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "review_detail" ADD COLUMN "achievements" JSONB;
ALTER TABLE "review_detail" ADD COLUMN "challenges" JSONB;
ALTER TABLE "review_detail" ADD COLUMN "root_causes" JSONB;
ALTER TABLE "review_detail" ADD COLUMN "lessons_learned" JSONB;
ALTER TABLE "review_detail" ADD COLUMN "next_cycle_focus" JSONB;
ALTER TABLE "review_detail" ADD COLUMN "score_before" DOUBLE PRECISION;
ALTER TABLE "review_detail" ADD COLUMN "score_after" DOUBLE PRECISION;
ALTER TABLE "review_detail" ADD COLUMN "completion_rate" DOUBLE PRECISION;
ALTER TABLE "review_detail" ADD COLUMN "reviewed_by" TEXT;
ALTER TABLE "review_detail" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "review_detail" ADD COLUMN "aggregated_data" JSONB;
ALTER TABLE "review_detail" ALTER COLUMN "is_draft" SET DEFAULT true;
ALTER TABLE "review_detail" ALTER COLUMN "summary" TYPE TEXT;

-- CreateIndex
CREATE INDEX "review_detail_review_type_period_idx" ON "review_detail"("review_type", "period");

-- AlterTable: insight_detail
ALTER TABLE "insight_detail" ALTER COLUMN "review_id" DROP NOT NULL;
ALTER TABLE "insight_detail" ADD COLUMN "insight_type" "InsightType" NOT NULL DEFAULT 'STRATEGY';
ALTER TABLE "insight_detail" ADD COLUMN "statement" TEXT;
ALTER TABLE "insight_detail" ADD COLUMN "confidence" DOUBLE PRECISION DEFAULT 0.5;
ALTER TABLE "insight_detail" ADD COLUMN "impact_score" DOUBLE PRECISION DEFAULT 50;
ALTER TABLE "insight_detail" ADD COLUMN "evidence" JSONB;
ALTER TABLE "insight_detail" ADD COLUMN "valid_from" TIMESTAMP(3);
ALTER TABLE "insight_detail" ADD COLUMN "valid_until" TIMESTAMP(3);
ALTER TABLE "insight_detail" ADD COLUMN "status" "InsightStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "insight_detail_insight_type_idx" ON "insight_detail"("insight_type");
CREATE INDEX "insight_detail_status_idx" ON "insight_detail"("status");
