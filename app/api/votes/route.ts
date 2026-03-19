// app/api/votes/route.ts
// Handles upvote / downvote / unvote for both posts and comments

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const voteSchema = z.object({
  targetId:   z.string().cuid(),
  targetType: z.enum(["post", "comment"]),
  value:      z.union([z.literal(1), z.literal(-1), z.literal(0)]), // 0 = remove vote
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { targetId, targetType, value } = voteSchema.parse(await req.json());

    const isPost    = targetType === "post";
    const whereKey  = isPost ? "userId_postId"    : "userId_commentId";
    const whereVal  = isPost
      ? { userId: user.id, postId: targetId }
      : { userId: user.id, commentId: targetId };

    // Find existing vote
    const existing = await prisma.vote.findUnique({ where: { [whereKey]: whereVal } as any });

    let scoreDelta = 0;

    if (value === 0) {
      // Remove vote
      if (existing) {
        await prisma.vote.delete({ where: { id: existing.id } });
        scoreDelta = -existing.value; // reverse old vote
      }
    } else if (existing) {
      if (existing.value === value) {
        // Same vote — treat as toggle off
        await prisma.vote.delete({ where: { id: existing.id } });
        scoreDelta = -existing.value;
      } else {
        // Flip vote (+1 → -1 or vice versa)
        await prisma.vote.update({ where: { id: existing.id }, data: { value } });
        scoreDelta = value - existing.value; // e.g. -1 - 1 = -2
      }
    } else {
      // New vote
      await prisma.vote.create({
        data: isPost
          ? { userId: user.id, postId: targetId, value }
          : { userId: user.id, commentId: targetId, value },
      });
      scoreDelta = value;
    }

    // Update cached score on the target
    if (scoreDelta !== 0) {
      if (isPost) {
        await prisma.post.update({
          where: { id: targetId },
          data: { score: { increment: scoreDelta } },
        });
      } else {
        await prisma.comment.update({
          where: { id: targetId },
          data: { score: { increment: scoreDelta } },
        });
      }
    }

    // Return new score
    const updated = isPost
      ? await prisma.post.findUnique({ where: { id: targetId }, select: { score: true } })
      : await prisma.comment.findUnique({ where: { id: targetId }, select: { score: true } });

    return NextResponse.json({
      score: updated?.score ?? 0,
      userVote: value === 0 ? null : (existing?.value === value ? null : value),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[POST /api/votes]", err);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
