import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteObject,
  extractStoredR2Key,
  resolveStoredImageUrl,
} from "@/r2";

const DISPLAY_NAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const FEED_SCOPE_VALUES = ["home", "following", "popular", "all"] as const;
const FEED_SORT_VALUES = ["hot", "new", "top", "rising"] as const;

function toPrismaFeedScope(value: (typeof FEED_SCOPE_VALUES)[number]) {
  return value.toUpperCase() as "HOME" | "FOLLOWING" | "POPULAR" | "ALL";
}

function toPrismaFeedSort(value: (typeof FEED_SORT_VALUES)[number]) {
  return value.toUpperCase() as "HOT" | "NEW" | "TOP" | "RISING";
}

function formatCooldownDays(msRemaining: number) {
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}

const profileSchema = z.object({
  displayName: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarKey: z.string().trim().max(512).nullable().optional(),
  defaultFeedScope: z.enum(FEED_SCOPE_VALUES).optional(),
  defaultFeedSort: z.enum(FEED_SORT_VALUES).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(await req.json());
    const nextDisplayName =
      data.displayName !== undefined
        ? data.displayName.trim() || user.username
        : user.displayName;
    const displayNameChanged = nextDisplayName !== user.displayName;

    if (displayNameChanged && user.displayNameUpdatedAt) {
      const msSinceLastChange =
        Date.now() - new Date(user.displayNameUpdatedAt).getTime();

      if (msSinceLastChange < DISPLAY_NAME_CHANGE_COOLDOWN_MS) {
        const daysRemaining = formatCooldownDays(
          DISPLAY_NAME_CHANGE_COOLDOWN_MS - msSinceLastChange
        );

        return NextResponse.json(
          {
            error: `Display name can only be changed once every 30 days. You can change it again in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
          },
          { status: 429 }
        );
      }
    }

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
        displayName: nextDisplayName,
        displayNameUpdatedAt: displayNameChanged
          ? new Date()
          : user.displayNameUpdatedAt,
        bio:
          data.bio !== undefined
            ? data.bio.trim() || null
            : user.bio,
        avatarUrl: nextAvatarUrl,
        defaultFeedScope:
          data.defaultFeedScope !== undefined
            ? toPrismaFeedScope(data.defaultFeedScope)
            : user.defaultFeedScope,
        defaultFeedSort:
          data.defaultFeedSort !== undefined
            ? toPrismaFeedSort(data.defaultFeedSort)
            : user.defaultFeedSort,
      },
      select: {
        username: true,
        displayName: true,
        displayNameUpdatedAt: true,
        bio: true,
        avatarUrl: true,
        defaultFeedScope: true,
        defaultFeedSort: true,
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
        defaultFeedScope: updatedUser.defaultFeedScope.toLowerCase(),
        defaultFeedSort: updatedUser.defaultFeedSort.toLowerCase(),
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
