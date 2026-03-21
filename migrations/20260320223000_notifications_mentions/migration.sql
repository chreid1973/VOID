-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'COMMENT_ON_POST',
  'REPLY_TO_COMMENT',
  'MENTION_IN_POST',
  'MENTION_IN_COMMENT'
);

-- CreateTable
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "commentId" TEXT,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_actorId_createdAt_idx" ON "Notification"("actorId", "createdAt");
CREATE INDEX "Notification_postId_createdAt_idx" ON "Notification"("postId", "createdAt");
CREATE INDEX "Notification_commentId_createdAt_idx" ON "Notification"("commentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
