import { prisma } from "../../../../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const { title, body, communityId } = json as {
    title?: string;
    body?: string;
    communityId?: string;
  };

  if (!title?.trim() || !communityId?.trim()) {
    return NextResponse.json(
      { error: "Title and community are required." },
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

  const trimmedTitle = title.trim();
  const trimmedBody = body?.trim() || null;
  const trimmedCommunityId = communityId.trim();

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        title: trimmedTitle,
        body: trimmedBody,
        communityId: trimmedCommunityId,
        authorId: user.id,
        score: 1,
      },
    });

    await tx.vote.create({
      data: {
        userId: user.id,
        postId: createdPost.id,
        value: 1,
      },
    });

    return createdPost;
  });

  return NextResponse.json({ ok: true, postId: post.id });
}
