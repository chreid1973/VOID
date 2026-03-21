import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  query: z.string().trim().min(1).max(40),
});

type MentionCandidate = {
  username: string;
  displayName: string | null;
};

function rankCandidate(query: string, candidate: MentionCandidate) {
  const q = query.toLowerCase();
  const username = candidate.username.toLowerCase();
  const displayName = candidate.displayName?.toLowerCase() ?? "";

  if (username === q) return 0;
  if (displayName === q) return 1;
  if (username.startsWith(q)) return 2;
  if (displayName.startsWith(q)) return 3;
  if (username.includes(q)) return 4;
  if (displayName.includes(q)) return 5;
  return 6;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = schema.parse(await req.json());

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        username: true,
        displayName: true,
      },
      take: 8,
    });

    const candidates = [...users].sort((a, b) => {
      return (
        rankCandidate(query, a) - rankCandidate(query, b) ||
        a.username.localeCompare(b.username)
      );
    });

    return NextResponse.json({
      users: candidates,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Enter a valid mention query." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search users." },
      { status: 500 }
    );
  }
}
