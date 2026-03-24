import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { prisma } from "../../../../lib/prisma";
import { createCommentNotifications } from "../../../../lib/notifications";
import { hasCommentContent, normalizeCommentGif } from "../../../../lib/commentGifs";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const { postId, body, parentId, gif } = json as {
    postId?: string;
    body?: string;
    parentId?: string | null;
    gif?: unknown;
  };

  if (!postId?.trim()) {
    return NextResponse.json(
      { error: "Post ID is required." },
      { status: 400 }
    );
  }

  const trimmedPostId = postId.trim();
  const trimmedBody = typeof body === "string" ? body.trim() : "";
  const trimmedParentId = parentId?.trim() || null;
  const normalizedGif = normalizeCommentGif(gif);

  if (gif != null && !normalizedGif) {
    return NextResponse.json(
      { error: "Invalid GIF selection." },
      { status: 400 }
    );
  }

  if (!hasCommentContent(trimmedBody, normalizedGif)) {
    return NextResponse.json(
      { error: "Add text or a GIF before posting your comment." },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Finish setting up your profile before commenting." },
      { status: 403 }
    );
  }

  const post = await prisma.post.findUnique({
    where: { id: trimmedPostId },
    select: { id: true, authorId: true, isLocked: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (post.isLocked) {
    return NextResponse.json({ error: "Post is locked." }, { status: 403 });
  }

  let parentAuthorId: string | null = null;

  if (trimmedParentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: trimmedParentId },
      select: { postId: true, authorId: true },
    });

    if (!parent || parent.postId !== trimmedPostId) {
      return NextResponse.json(
        { error: "Invalid parent comment." },
        { status: 400 }
      );
    }

    parentAuthorId = parent.authorId;
  }

  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        body: trimmedBody,
        gifId: normalizedGif?.id ?? null,
        gifUrl: normalizedGif?.url ?? null,
        gifProvider: normalizedGif?.provider ?? null,
        postId: trimmedPostId,
        authorId: user.id,
        parentId: trimmedParentId,
        score: 1,
      },
    });

    await tx.vote.create({
      data: {
        userId: user.id,
        commentId: comment.id,
        value: 1,
      },
    });

    await tx.post.update({
      where: { id: trimmedPostId },
      data: {
        commentCount: {
          increment: 1,
        },
      },
    });

    await createCommentNotifications(tx, {
      actorUserId: user.id,
      postId: trimmedPostId,
      commentId: comment.id,
      body: trimmedBody,
      postAuthorId: post.authorId,
      parentAuthorId,
    });
  });

  revalidateTag("post-page-content");
  revalidateTag("feed-content");

  return NextResponse.json({ ok: true });
}
