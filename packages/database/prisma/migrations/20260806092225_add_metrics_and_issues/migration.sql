-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('BELOW_TARGET', 'ABOVE_WARNING', 'BELOW_WARNING');

-- CreateEnum
CREATE TYPE "MetricSourceType" AS ENUM ('SYSTEM', 'MANUAL', 'AI');

-- AlterEnum
ALTER TYPE "PdcaStage" ADD VALUE 'CHECK';

-- AlterTable
ALTER TABLE "issue_detail" ADD COLUMN     "actual_value" DOUBLE PRECISION,
ADD COLUMN     "detected_at" TIMESTAMP(3),
ADD COLUMN     "expected_value" DOUBLE PRECISION,
ADD COLUMN     "gap_type" "GapType",
ADD COLUMN     "gap_value" DOUBLE PRECISION,
ADD COLUMN     "severity" TEXT DEFAULT 'medium';

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "calculation_type" TEXT NOT NULL,
    "unit" TEXT,
    "target_value" DOUBLE PRECISION,
    "warning_threshold" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_values" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "calculation_version" TEXT NOT NULL DEFAULT '1.0',
    "metadata" JSONB,
    "source_type" "MetricSourceType" NOT NULL DEFAULT 'SYSTEM',
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_gaps" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "gap_type" "GapType" NOT NULL,
    "expected_value" DOUBLE PRECISION NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "gap_value" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "issue_id" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metrics_name_key" ON "metrics"("name");

-- CreateIndex
CREATE INDEX "metrics_workspace_id_idx" ON "metrics"("workspace_id");

-- CreateIndex
CREATE INDEX "metrics_workspace_id_is_active_idx" ON "metrics"("workspace_id", "is_active");

-- CreateIndex
CREATE INDEX "metric_values_workspace_id_metric_id_idx" ON "metric_values"("workspace_id", "metric_id");

-- CreateIndex
CREATE INDEX "metric_values_metric_id_measured_at_idx" ON "metric_values"("metric_id", "measured_at");

-- CreateIndex
CREATE INDEX "metric_values_workspace_id_cycle_id_idx" ON "metric_values"("workspace_id", "cycle_id");

-- CreateIndex
CREATE INDEX "metric_gaps_workspace_id_metric_id_is_open_idx" ON "metric_gaps"("workspace_id", "metric_id", "is_open");

-- CreateIndex
CREATE INDEX "metric_gaps_metric_id_gap_type_idx" ON "metric_gaps"("metric_id", "gap_type");

-- CreateIndex
CREATE INDEX "metric_gaps_workspace_id_cycle_id_gap_type_idx" ON "metric_gaps"("workspace_id", "cycle_id", "gap_type");

-- CreateIndex
CREATE INDEX "issue_detail_metric_name_idx" ON "issue_detail"("metric_name");

-- CreateIndex
CREATE INDEX "issue_detail_gap_type_idx" ON "issue_detail"("gap_type");

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "pdca_cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_gaps" ADD CONSTRAINT "metric_gaps_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_gaps" ADD CONSTRAINT "metric_gaps_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_gaps" ADD CONSTRAINT "metric_gaps_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "pdca_cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_gaps" ADD CONSTRAINT "metric_gaps_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
