import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const { postId, body } = json as {
    postId?: string;
    body?: string;
  };

  if (!postId?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "Post ID and comment body are required." },
      { status: 400 }
    );
  }

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

  await prisma.comment.create({
    data: {
      body: body.trim(),
      postId,
      authorId: user.id,
    },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      commentCount: {
        increment: 1,
      },
    },
  });

  return NextResponse.json({ ok: true });
}