ALTER TABLE "Post"
ADD COLUMN "crosspostOfPostId" TEXT;

CREATE INDEX "Post_crosspostOfPostId_idx" ON "Post"("crosspostOfPostId");

ALTER TABLE "Post"
ADD CONSTRAINT "Post_crosspostOfPostId_fkey"
FOREIGN KEY ("crosspostOfPostId") REFERENCES "Post"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
