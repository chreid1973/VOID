ALTER TABLE "Post"
ADD COLUMN "publicId" TEXT;

WITH numbered AS (
  SELECT
    id,
    SUBSTRING(md5(id) FROM 1 FOR 10) AS public_id
  FROM "Post"
)
UPDATE "Post" AS post
SET "publicId" = numbered.public_id
FROM numbered
WHERE post.id = numbered.id;

ALTER TABLE "Post"
ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX "Post_publicId_key" ON "Post"("publicId");
