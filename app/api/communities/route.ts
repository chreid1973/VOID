// app/api/communities/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";

// ── GET /api/communities ───────────────────────────────────────

export async function GET() {
  try {
    const communities = await prisma.community.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true, posts: true } },
      },
    });
    return NextResponse.json({ communities });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 });
  }
}

// ── POST /api/communities ──────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only"),
  displayName: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
  icon:        z.string().max(4).optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isNSFW:      z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = createSchema.parse(await req.json());
    const createData: Prisma.CommunityCreateInput = {
      name: data.name,
      displayName: data.displayName,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.isNSFW !== undefined ? { isNSFW: data.isNSFW } : {}),
    };

    // Check name taken
    const exists = await prisma.community.findUnique({ where: { name: data.name } });
    if (exists) {
      return NextResponse.json({ error: "Community name already taken" }, { status: 409 });
    }

    const community = await prisma.$transaction(async (tx) => {
      const c = await tx.community.create({ data: createData });
      // Creator becomes admin
      await tx.communityMember.create({
        data: { userId: user.id, communityId: c.id, role: "ADMIN" },
      });
      return c;
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
