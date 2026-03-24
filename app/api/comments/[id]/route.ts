import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";
import { hasCommentContent, normalizeCommentGif } from "@/lib/commentGifs";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: {
        authorId: true,
        createdAt: true,
        isDeleted: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (comment.isDeleted) {
      return NextResponse.json(
        { error: "Comment already deleted" },
        { status: 400 }
      );
    }

    if (Date.now() - comment.createdAt.getTime() > 60_000) {
      return NextResponse.json(
        { error: "Comment edit window expired" },
        { status: 403 }
      );
    }

    const json = await req.json();
    const body = typeof json?.body === "string" ? json.body.trim() : "";
    const gif = normalizeCommentGif(json?.gif);

    if (json?.gif != null && !gif) {
      return NextResponse.json({ error: "Invalid GIF selection." }, { status: 400 });
    }

    if (!hasCommentContent(body, gif)) {
      return NextResponse.json(
        { error: "Add text or a GIF before saving your comment." },
        { status: 400 }
      );
    }

    await prisma.comment.update({
      where: { id: params.id },
      data: {
        body,
        gifId: gif?.id ?? null,
        gifUrl: gif?.url ?? null,
        gifProvider: gif?.provider ?? null,
      },
    });

    revalidateTag("post-page-content");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[PATCH /api/comments/:id]", err);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: {
        authorId: true,
        isDeleted: true,
        postId: true,
        replies: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (comment.isDeleted) {
      return NextResponse.json(
        { error: "Comment already deleted" },
        { status: 400 }
      );
    }

    if (comment.replies.length > 0) {
      await prisma.comment.update({
        where: { id: params.id },
        data: {
          body: "[deleted]",
          gifId: null,
          gifUrl: null,
          gifProvider: null,
          isDeleted: true,
        },
      });
    } else {
      await prisma.$transaction([
        prisma.comment.delete({
          where: { id: params.id },
        }),
        prisma.post.update({
          where: { id: comment.postId },
          data: {
            commentCount: {
              decrement: 1,
            },
          },
        }),
      ]);
    }

    revalidateTag("post-page-content");
    revalidateTag("feed-content");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[DELETE /api/comments/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
