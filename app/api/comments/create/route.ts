import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

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
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        username: `user_${userId.slice(0, 8)}`,
      },
    });
  }

  if (trimmedParentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: trimmedParentId },
      select: { postId: true },
    });

    if (!parent || parent.postId !== trimmedPostId) {
      return NextResponse.json(
        { error: "Invalid parent comment." },
        { status: 400 }
      );
    }
  }

  await prisma.comment.create({
    data: {
      body: trimmedBody,
      postId: trimmedPostId,
      authorId: user.id,
      parentId: trimmedParentId,
    },
  });

  await prisma.post.update({
    where: { id: trimmedPostId },
    data: {
      commentCount: {
        increment: 1,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
