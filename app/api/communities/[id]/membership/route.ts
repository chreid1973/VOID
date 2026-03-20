import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();

    const community = await prisma.community.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found." }, { status: 404 });
    }

    await prisma.communityMember.upsert({
      where: {
        userId_communityId: {
          userId: user.id,
          communityId: community.id,
        },
      },
      create: {
        userId: user.id,
        communityId: community.id,
      },
      update: {},
    });

    return NextResponse.json({ ok: true, isMember: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    console.error("[POST /api/communities/:id/membership]", error);
    return NextResponse.json(
      { error: "Failed to join community." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();

    await prisma.communityMember.deleteMany({
      where: {
        userId: user.id,
        communityId: params.id,
      },
    });

    return NextResponse.json({ ok: true, isMember: false });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    console.error("[DELETE /api/communities/:id/membership]", error);
    return NextResponse.json(
      { error: "Failed to leave community." },
      { status: 500 }
    );
  }
}
