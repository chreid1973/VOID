import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { createCommentNotifications } from "../../../../lib/notifications";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const { postId, body, parentId } = json as {
    postId?: string;
    body?: string;
    parentId?: string | null;
  };

  if (!postId?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "Post ID and comment body are required." },
      { status: 400 }
    );
  }

  const trimmedPostId = postId.trim();
  const trimmedBody = body.trim();
  const trimmedParentId = parentId?.trim() || null;

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

  return NextResponse.json({ ok: true });
}
