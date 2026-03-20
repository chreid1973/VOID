import { NextResponse } from "next/server";
import { ReportStatus, ReportTargetType } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";

const createReportSchema = z
  .object({
    targetType: z.nativeEnum(ReportTargetType),
    postId: z.string().trim().min(1).optional(),
    commentId: z.string().trim().min(1).optional(),
    reason: z.enum(["SPAM", "HARASSMENT", "ILLEGAL", "IMPERSONATION", "OTHER"]),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === ReportTargetType.POST) {
      if (!value.postId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Post ID is required.",
          path: ["postId"],
        });
      }

      if (value.commentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Comment ID is not allowed for post reports.",
          path: ["commentId"],
        });
      }
    }

    if (value.targetType === ReportTargetType.COMMENT) {
      if (!value.commentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Comment ID is required.",
          path: ["commentId"],
        });
      }

      if (value.postId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Post ID is not allowed for comment reports.",
          path: ["postId"],
        });
      }
    }
  });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = createReportSchema.parse(await req.json());
    const note = data.note?.trim() || null;

    if (data.targetType === ReportTargetType.POST) {
      const post = await prisma.post.findUnique({
        where: { id: data.postId! },
        select: {
          id: true,
          isHidden: true,
        },
      });

      if (!post || post.isHidden) {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
      }

      const existingReport = await prisma.report.findFirst({
        where: {
          reporterId: user.id,
          targetType: ReportTargetType.POST,
          postId: post.id,
          status: ReportStatus.OPEN,
        },
        select: { id: true },
      });

      if (existingReport) {
        return NextResponse.json(
          { error: "You already have an open report on this post." },
          { status: 409 }
        );
      }

      await prisma.report.create({
        data: {
          reporterId: user.id,
          targetType: ReportTargetType.POST,
          postId: post.id,
          reason: data.reason,
          note,
        },
      });
    } else {
      const comment = await prisma.comment.findUnique({
        where: { id: data.commentId! },
        select: {
          id: true,
          isDeleted: true,
          isHidden: true,
        },
      });

      if (!comment || comment.isDeleted || comment.isHidden) {
        return NextResponse.json(
          { error: "Comment not found." },
          { status: 404 }
        );
      }

      const existingReport = await prisma.report.findFirst({
        where: {
          reporterId: user.id,
          targetType: ReportTargetType.COMMENT,
          commentId: comment.id,
          status: ReportStatus.OPEN,
        },
        select: { id: true },
      });

      if (existingReport) {
        return NextResponse.json(
          { error: "You already have an open report on this comment." },
          { status: 409 }
        );
      }

      await prisma.report.create({
        data: {
          reporterId: user.id,
          targetType: ReportTargetType.COMMENT,
          commentId: comment.id,
          reason: data.reason,
          note,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[POST /api/reports]", err);
    return NextResponse.json(
      { error: "Failed to submit report." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "RESOLVED" || statusParam === "DISMISSED"
        ? statusParam
        : "OPEN";

    const reports = await prisma.report.findMany({
      where: {
        status,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            isHidden: true,
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            isDeleted: true,
            isHidden: true,
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                isHidden: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[GET /api/reports]", err);
    return NextResponse.json(
      { error: "Failed to load reports." },
      { status: 500 }
    );
  }
}
