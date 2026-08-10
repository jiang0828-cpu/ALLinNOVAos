-- Add timezone column to workspace table
ALTER TABLE "workspace" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai';
