import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteObject,
  extractStoredR2Key,
  resolveStoredImageUrl,
} from "@/r2";

const profileSchema = z.object({
  displayName: z.string().trim().max(64).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarKey: z.string().trim().max(512).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(await req.json());

    let nextAvatarUrl = user.avatarUrl ?? null;

    if (data.avatarKey !== undefined) {
      const trimmedAvatarKey = data.avatarKey?.trim() ?? "";

      if (!trimmedAvatarKey) {
        nextAvatarUrl = null;
      } else {
        const extractedKey = extractStoredR2Key(trimmedAvatarKey);

        if (extractedKey) {
          if (!extractedKey.startsWith("avatars/")) {
            return NextResponse.json(
              { error: "Invalid avatar image." },
              { status: 400 }
            );
          }

          nextAvatarUrl = extractedKey;
        } else if (trimmedAvatarKey === user.avatarUrl) {
          nextAvatarUrl = user.avatarUrl;
        } else {
          return NextResponse.json(
            { error: "Invalid avatar image." },
            { status: 400 }
          );
        }
      }
    }

    const previousAvatarKey = user.avatarUrl
      ? extractStoredR2Key(user.avatarUrl)
      : null;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName:
          data.displayName !== undefined
            ? data.displayName.trim() || null
            : user.displayName,
        bio:
          data.bio !== undefined
            ? data.bio.trim() || null
            : user.bio,
        avatarUrl: nextAvatarUrl,
      },
      select: {
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
      },
    });

    const nextAvatarKey = updatedUser.avatarUrl
      ? extractStoredR2Key(updatedUser.avatarUrl)
      : null;

    if (previousAvatarKey && previousAvatarKey !== nextAvatarKey) {
      try {
        await deleteObject(previousAvatarKey);
      } catch (cleanupErr) {
        console.error("[PATCH /api/profile] failed to delete avatar", cleanupErr);
      }
    }

    return NextResponse.json({
      ok: true,
      user: {
        ...updatedUser,
        resolvedAvatarUrl: updatedUser.avatarUrl
          ? resolveStoredImageUrl(updatedUser.avatarUrl)
          : null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[PATCH /api/profile]", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
