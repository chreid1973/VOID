// app/api/posts/[id]/comments/route.ts
// Returns a full nested comment tree for a post

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";
import { createCommentNotifications } from "@/lib/notifications";

type Params = { params: { id: string } };

// ── GET /api/posts/:id/comments ────────────────────────────────
// Returns flat list from DB, client or server builds the tree.
// We build the tree here for convenience.
// ──────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: params.id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // Build nested tree from flat list
    const tree = buildTree(comments);

    return NextResponse.json({ comments: tree });
  } catch (err) {
    console.error("[GET /api/posts/:id/comments]", err);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// ── POST /api/posts/:id/comments ───────────────────────────────
// Body: { body, parentId? }
// ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  body:     z.string().min(1).max(10000),
  parentId: z.string().cuid().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();

    // Post must exist
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, isLocked: true },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.isLocked) return NextResponse.json({ error: "Post is locked" }, { status: 403 });

    const { body, parentId } = createSchema.parse(await req.json());

    let parentAuthorId: string | null = null;

    // If replying, parent must belong to same post
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true, authorId: true },
      });
      if (!parent || parent.postId !== params.id) {
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
      }

      parentAuthorId = parent.authorId;
    }

    const comment = await prisma.$transaction(async (tx) => {
      const createdComment = await tx.comment.create({
        data: {
          body,
          parentId: parentId ?? null,
          authorId: user.id,
          postId: params.id,
          score: 1,
        },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      await tx.post.update({
        where: { id: params.id },
        data: { commentCount: { increment: 1 } },
      });

      await tx.vote.create({
        data: { userId: user.id, commentId: createdComment.id, value: 1 },
      });

      await createCommentNotifications(tx, {
        actorUserId: user.id,
        postId: params.id,
        commentId: createdComment.id,
        body,
        postAuthorId: post.authorId,
        parentAuthorId,
      });

      return createdComment;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[POST /api/posts/:id/comments]", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

// ── Tree builder ───────────────────────────────────────────────

type FlatComment = {
  id: string;
  parentId: string | null;
  [key: string]: any;
};

type TreeComment = FlatComment & { replies: TreeComment[] };

function buildTree(flat: FlatComment[]): TreeComment[] {
  const map = new Map<string, TreeComment>();
  const roots: TreeComment[] = [];

  // First pass: create nodes
  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  // Second pass: attach children
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
