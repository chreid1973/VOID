import { NextResponse } from "next/server";
import { ModerationActionType, ReportStatus, ReportTargetType } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject, extractStoredR2Key } from "@/r2";

const updateReportSchema = z.object({
  action: z.enum([
    "RESOLVE",
    "DISMISS",
    "HIDE_POST",
    "DELETE_POST",
    "HIDE_COMMENT",
    "DELETE_COMMENT",
  ]),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const admin = await requireAdminUser();
    const data = updateReportSchema.parse(await req.json());

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        post: {
          select: {
            id: true,
            imageKey: true,
            imagePreviewKey: true,
            authorId: true,
          },
        },
        comment: {
          select: {
            id: true,
            postId: true,
            authorId: true,
            isDeleted: true,
            replies: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const nextStatus =
      data.action === "DISMISS" ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;

    await prisma.$transaction(async (tx) => {
      let moderationActionType: ModerationActionType | null = null;
      let moderationUserId: string | null = null;

      if (data.action === "HIDE_POST" || data.action === "DELETE_POST") {
        if (report.targetType !== ReportTargetType.POST || !report.post) {
          throw new Error("INVALID_TARGET");
        }

        if (data.action === "HIDE_POST") {
          moderationActionType = ModerationActionType.HIDE_POST;
          moderationUserId = report.post.authorId;
          await tx.post.update({
            where: { id: report.post.id },
            data: { isHidden: true },
          });
        } else {
          moderationActionType = ModerationActionType.DELETE_POST;
          moderationUserId = report.post.authorId;
          await tx.post.delete({
            where: { id: report.post.id },
          });
        }
      }

      if (data.action === "HIDE_COMMENT" || data.action === "DELETE_COMMENT") {
        if (report.targetType !== ReportTargetType.COMMENT || !report.comment) {
          throw new Error("INVALID_TARGET");
        }

        if (data.action === "HIDE_COMMENT") {
          moderationActionType = ModerationActionType.HIDE_COMMENT;
          moderationUserId = report.comment.authorId;
          await tx.comment.update({
            where: { id: report.comment.id },
            data: { isHidden: true },
          });
        } else if (report.comment.isDeleted) {
          throw new Error("COMMENT_ALREADY_DELETED");
        } else if (report.comment.replies.length > 0) {
          moderationActionType = ModerationActionType.DELETE_COMMENT;
          moderationUserId = report.comment.authorId;
          await tx.comment.update({
            where: { id: report.comment.id },
            data: {
              body: "[deleted]",
              isDeleted: true,
            },
          });
        } else {
          moderationActionType = ModerationActionType.DELETE_COMMENT;
          moderationUserId = report.comment.authorId;
          await tx.comment.delete({
            where: { id: report.comment.id },
          });
          await tx.post.update({
            where: { id: report.comment.postId },
            data: {
              commentCount: {
                decrement: 1,
              },
            },
          });
        }
      }

      await tx.report.update({
        where: { id: report.id },
        data: {
          status: nextStatus,
          resolvedAt: new Date(),
          resolvedById: admin.id,
        },
      });

      if (moderationActionType && moderationUserId) {
        await tx.moderationAction.create({
          data: {
            userId: moderationUserId,
            adminId: admin.id,
            reportId: report.id,
            type: moderationActionType,
            note:
              report.note?.trim() ||
              `From report: ${report.reason.toLowerCase().replace(/_/g, " ")}`,
          },
        });
      }
    });

    if (data.action === "DELETE_POST" && report.post) {
      const storedKeys = new Set(
        [report.post.imageKey, report.post.imagePreviewKey]
          .map((imageRef) => (imageRef ? extractStoredR2Key(imageRef) : null))
          .filter((key): key is string => Boolean(key))
      );

      for (const storedKey of Array.from(storedKeys)) {
        try {
          await deleteObject(storedKey);
        } catch (cleanupErr) {
          console.error("[PATCH /api/reports/:id] failed to delete post image", cleanupErr);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "INVALID_TARGET") {
      return NextResponse.json(
        { error: "This report no longer has valid target content." },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "COMMENT_ALREADY_DELETED") {
      return NextResponse.json(
        { error: "Comment already deleted." },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/reports/:id]", err);
    return NextResponse.json(
      { error: "Failed to update report." },
      { status: 500 }
    );
  }
}
