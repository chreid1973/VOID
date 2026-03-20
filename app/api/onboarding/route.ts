import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be 24 characters or less.")
    .transform((value) => value.toLowerCase())
    .refine(
      (value) => /^[a-z0-9_]+$/.test(value),
      "Use lowercase letters, numbers, or underscores only."
    ),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(64, "Display name must be 64 characters or less."),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const data = onboardingSchema.parse(await req.json());
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (existingUser) {
      return NextResponse.json({
        ok: true,
        user: existingUser,
      });
    }

    const usernameTaken = await prisma.user.findFirst({
      where: {
        username: {
          equals: data.username,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (usernameTaken) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        clerkId: userId,
        username: data.username,
        displayName: data.displayName,
        avatarUrl: clerkUser.imageUrl,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }

    console.error("[POST /api/onboarding]", err);
    return NextResponse.json(
      { error: "Failed to finish account setup." },
      { status: 500 }
    );
  }
}
