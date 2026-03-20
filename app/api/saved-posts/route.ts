import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";

const savedPostSchema = z.object({
  postId: z.string().trim().min(1).max(191),
});

async function loadVisiblePost(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      isHidden: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { postId } = savedPostSchema.parse(await req.json());
    const post = await loadVisiblePost(postId);

    if (!post || post.isHidden) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.savedPost.upsert({
      where: {
        userId_postId: {
          userId: user.id,
          postId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        postId,
      },
    });

    return NextResponse.json({ saved: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Invalid save request" },
        { status: 422 }
      );
    }

    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Sign in to save posts." },
        { status: 401 }
      );
    }

    console.error("[POST /api/saved-posts]", err);
    return NextResponse.json(
      { error: "Failed to save post." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { postId } = savedPostSchema.parse(await req.json());

    await prisma.savedPost.deleteMany({
      where: {
        userId: user.id,
        postId,
      },
    });

    return NextResponse.json({ saved: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Invalid save request" },
        { status: 422 }
      );
    }

    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Sign in to save posts." },
        { status: 401 }
      );
    }

    console.error("[DELETE /api/saved-posts]", err);
    return NextResponse.json(
      { error: "Failed to remove saved post." },
      { status: 500 }
    );
  }
}
