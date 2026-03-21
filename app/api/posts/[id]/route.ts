import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";
import { deleteObject, extractStoredR2Key } from "@/r2";
import { appendPlainTextToRichHtml, plainTextToRichHtml } from "@/lib/richText";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        authorId: true,
        body: true,
        bodyHtml: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const update =
      typeof json?.update === "string" ? json.update.trim() : "";

    if (!update) {
      return NextResponse.json({ error: "Update is required" }, { status: 400 });
    }

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, " UTC");
    const appendedUpdate = `EDIT: ${timestamp}\n${update}`;
    const nextBody = post.body
      ? `${post.body}\n\n${appendedUpdate}`
      : appendedUpdate;

    await prisma.post.update({
      where: { id: params.id },
      data: {
        body: nextBody,
        bodyHtml: appendPlainTextToRichHtml(
          post.bodyHtml ?? plainTextToRichHtml(post.body),
          appendedUpdate
        ),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[PATCH /api/posts/:id]", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        authorId: true,
        imageKey: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storedImageKey = post.imageKey
      ? extractStoredR2Key(post.imageKey)
      : null;

    await prisma.post.delete({
      where: { id: params.id },
    });

    if (storedImageKey) {
      try {
        await deleteObject(storedImageKey);
      } catch (cleanupErr) {
        console.error("[DELETE /api/posts/:id] failed to delete image", cleanupErr);
      }
    }

    revalidateTag("community-navigation");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[DELETE /api/posts/:id]", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
