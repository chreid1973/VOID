import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const targetUserId = params.id.trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "User is required." }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot follow yourself." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.userFollow.upsert({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
      create: {
        followerId: user.id,
        followingId: targetUserId,
      },
      update: {},
    });

    return NextResponse.json({ ok: true, isFollowing: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    console.error("[POST /api/follows/[id]]", err);
    return NextResponse.json(
      { error: "Failed to follow user." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const targetUserId = params.id.trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "User is required." }, { status: 400 });
    }

    await prisma.userFollow.deleteMany({
      where: {
        followerId: user.id,
        followingId: targetUserId,
      },
    });

    return NextResponse.json({ ok: true, isFollowing: false });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    console.error("[DELETE /api/follows/[id]]", err);
    return NextResponse.json(
      { error: "Failed to unfollow user." },
      { status: 500 }
    );
  }
}
