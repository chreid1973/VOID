import { NextResponse } from "next/server";
import { ModerationActionType } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser } from "@/auth";
import { prisma } from "@/lib/prisma";

const createModerationActionSchema = z.object({
  userId: z.string().trim().min(1),
  type: z.enum(["NOTE", "WARNING"]),
  note: z
    .string()
    .trim()
    .min(1, "A note is required.")
    .max(1000, "Keep notes under 1000 characters."),
  reportId: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();
    const data = createModerationActionSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (data.reportId) {
      const report = await prisma.report.findUnique({
        where: { id: data.reportId },
        select: { id: true },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }
    }

    await prisma.moderationAction.create({
      data: {
        userId: data.userId,
        adminId: admin.id,
        reportId: data.reportId,
        type: data.type as ModerationActionType,
        note: data.note,
      },
    });

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
    console.error("[POST /api/moderation-actions]", err);
    return NextResponse.json(
      { error: "Failed to save moderation action." },
      { status: 500 }
    );
  }
}
