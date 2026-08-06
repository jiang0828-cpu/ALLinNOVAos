-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('GOAL', 'PROJECT', 'TASK', 'IDEA', 'ISSUE', 'SUGGESTION', 'REVIEW', 'INSIGHT', 'DECISION');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P0', 'P1', 'P2');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "IssueLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'SPRINT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'TEAM', 'FAMILY');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'REVIEWING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ADOPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'CONVERT', 'PUBLISH');

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_member" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdca_cycle" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "domain_id" TEXT,
    "parent_cycle_id" TEXT,
    "cycleType" "CycleType" NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'PLANNED',
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pdca_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "WorkItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION,
    "actual_value" DOUBLE PRECISION,
    "priority" "Priority" NOT NULL DEFAULT 'P2',
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),

    CONSTRAINT "goal_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "goal_id" TEXT,
    "summary" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "project_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "project_id" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'P2',
    "eta" TEXT,
    "assignee" TEXT,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',

    CONSTRAINT "task_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "converted_to_goal_id" TEXT,

    CONSTRAINT "idea_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "task_id" TEXT,
    "metric_name" TEXT,
    "metric_target_value" DOUBLE PRECISION,
    "metric_actual_value" DOUBLE PRECISION,
    "level" "IssueLevel" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "issue_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "reason" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'P2',
    "source" TEXT,
    "is_converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_task_id" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "suggestion_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "cycleType" "CycleType" NOT NULL,
    "period" TEXT NOT NULL,
    "summary" TEXT,
    "score" DOUBLE PRECISION,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "review_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "insight_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_detail" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "impact" "IssueLevel",

    CONSTRAINT "decision_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "work_item_id" TEXT,
    "action" "ActivityAction" NOT NULL,
    "actor" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "rebuilded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_type_idx" ON "workspace"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "workspace_member_workspace_id_idx" ON "workspace_member"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_member_user_id_workspace_id_key" ON "workspace_member"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "domain_workspace_id_idx" ON "domain"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "domain_workspace_id_name_key" ON "domain"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "pdca_cycle_workspace_id_cycleType_status_idx" ON "pdca_cycle"("workspace_id", "cycleType", "status");

-- CreateIndex
CREATE INDEX "pdca_cycle_domain_id_idx" ON "pdca_cycle"("domain_id");

-- CreateIndex
CREATE INDEX "pdca_cycle_cycleType_start_date_end_date_idx" ON "pdca_cycle"("cycleType", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "work_items_workspace_id_idx" ON "work_items"("workspace_id");

-- CreateIndex
CREATE INDEX "work_items_type_status_idx" ON "work_items"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "goal_detail_work_item_id_key" ON "goal_detail"("work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_detail_work_item_id_key" ON "project_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "project_detail_goal_id_idx" ON "project_detail"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_detail_work_item_id_key" ON "task_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "task_detail_project_id_idx" ON "task_detail"("project_id");

-- CreateIndex
CREATE INDEX "task_detail_status_idx" ON "task_detail"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idea_detail_work_item_id_key" ON "idea_detail"("work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_detail_work_item_id_key" ON "issue_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "issue_detail_task_id_idx" ON "issue_detail"("task_id");

-- CreateIndex
CREATE INDEX "issue_detail_status_idx" ON "issue_detail"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suggestion_detail_work_item_id_key" ON "suggestion_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "suggestion_detail_issue_id_idx" ON "suggestion_detail"("issue_id");

-- CreateIndex
CREATE INDEX "suggestion_detail_status_idx" ON "suggestion_detail"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_detail_work_item_id_key" ON "review_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "review_detail_cycleType_period_idx" ON "review_detail"("cycleType", "period");

-- CreateIndex
CREATE INDEX "review_detail_status_idx" ON "review_detail"("status");

-- CreateIndex
CREATE UNIQUE INDEX "insight_detail_work_item_id_key" ON "insight_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "insight_detail_review_id_idx" ON "insight_detail"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "decision_detail_work_item_id_key" ON "decision_detail"("work_item_id");

-- CreateIndex
CREATE INDEX "decision_detail_review_id_idx" ON "decision_detail"("review_id");

-- CreateIndex
CREATE INDEX "activity_events_workspace_id_idx" ON "activity_events"("workspace_id");

-- CreateIndex
CREATE INDEX "activity_events_work_item_id_idx" ON "activity_events"("work_item_id");

-- CreateIndex
CREATE INDEX "activity_events_action_idx" ON "activity_events"("action");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_workspace_id_rebuilded_at_idx" ON "dashboard_snapshots"("workspace_id", "rebuilded_at");

-- AddForeignKey
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain" ADD CONSTRAINT "domain_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdca_cycle" ADD CONSTRAINT "pdca_cycle_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdca_cycle" ADD CONSTRAINT "pdca_cycle_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdca_cycle" ADD CONSTRAINT "pdca_cycle_parent_cycle_id_fkey" FOREIGN KEY ("parent_cycle_id") REFERENCES "pdca_cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_detail" ADD CONSTRAINT "goal_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_detail" ADD CONSTRAINT "project_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_detail" ADD CONSTRAINT "task_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_detail" ADD CONSTRAINT "idea_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_detail" ADD CONSTRAINT "issue_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_detail" ADD CONSTRAINT "suggestion_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_detail" ADD CONSTRAINT "review_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_detail" ADD CONSTRAINT "insight_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_detail" ADD CONSTRAINT "decision_detail_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
