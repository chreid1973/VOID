import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../lib/prisma";
import { createPostPreviewVariant } from "../lib/postImagePreview";

type Options = {
  batchSize: number;
  limit: number | null;
  dryRun: boolean;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseArgs(argv: string[]): Options {
  let batchSize = 25;
  let limit: number | null = null;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--batch-size=")) {
      batchSize = parsePositiveInt(arg.split("=")[1], batchSize);
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const parsed = parsePositiveInt(arg.split("=")[1], 0);
      limit = parsed > 0 ? parsed : null;
    }
  }

  return {
    batchSize,
    limit,
    dryRun,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log(
    `[backfill-post-previews] starting (batchSize=${options.batchSize}, limit=${options.limit ?? "all"}, dryRun=${options.dryRun})`
  );

  const totalPending = await prisma.post.count({
    where: {
      imageKey: { not: null },
      imagePreviewKey: null,
    },
  });

  console.log(`[backfill-post-previews] pending posts: ${totalPending}`);

  let processed = 0;
  let updated = 0;
  let failed = 0;
  const attemptedIds = new Set<string>();

  while (true) {
    const remaining = options.limit == null ? options.batchSize : options.limit - processed;
    if (remaining <= 0) break;

    const posts = await prisma.post.findMany({
      where: {
        imageKey: { not: null },
        imagePreviewKey: null,
        ...(attemptedIds.size > 0
          ? { id: { notIn: Array.from(attemptedIds) } }
          : {}),
      },
      select: {
        id: true,
        publicId: true,
        imageKey: true,
      },
      orderBy: {
        id: "asc",
      },
      take: Math.min(options.batchSize, remaining),
    });

    if (posts.length === 0) {
      break;
    }

    for (const post of posts) {
      attemptedIds.add(post.id);
      processed += 1;

      if (!post.imageKey) {
        console.warn(`[backfill-post-previews] skipping ${post.publicId}: no imageKey`);
        continue;
      }

      if (options.dryRun) {
        console.log(
          `[backfill-post-previews] dry-run would backfill ${post.publicId} from ${post.imageKey}`
        );
        continue;
      }

      const previewKey = await createPostPreviewVariant(post.imageKey, post.id);

      if (!previewKey) {
        failed += 1;
        console.warn(`[backfill-post-previews] failed to create preview for ${post.publicId}`);
        continue;
      }

      await prisma.post.update({
        where: { id: post.id },
        data: { imagePreviewKey: previewKey },
      });

      updated += 1;
      console.log(
        `[backfill-post-previews] updated ${post.publicId} -> ${previewKey}`
      );
    }
  }

  const remainingPending = await prisma.post.count({
    where: {
      imageKey: { not: null },
      imagePreviewKey: null,
    },
  });

  console.log(
    `[backfill-post-previews] done (processed=${processed}, updated=${updated}, failed=${failed}, remaining=${remainingPending}, dryRun=${options.dryRun})`
  );
}

main()
  .catch((error) => {
    console.error("[backfill-post-previews] fatal", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
