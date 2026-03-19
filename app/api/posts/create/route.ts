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

  const post = await prisma.post.create({
    data: {
      title: title.trim(),
      body: body?.trim() || null,
      communityId,
      authorId: user.id,
    },
  });

  return NextResponse.json({ ok: true, postId: post.id });
}