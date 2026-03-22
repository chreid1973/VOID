import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveExistingMentionUsernames } from "@/lib/mentions";

const schema = z.object({
  usernames: z
    .array(z.string().trim().regex(/^[a-z0-9_]{3,24}$/))
    .max(20),
});

export async function POST(req: NextRequest) {
  try {
    const { usernames } = schema.parse(await req.json());
    const normalizedUsernames = Array.from(
      new Set(
        usernames
          .map((username) => username.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (normalizedUsernames.length === 0) {
      return NextResponse.json({ mentions: [] });
    }

    const mentionSet = new Set(
      await resolveExistingMentionUsernames(normalizedUsernames)
    );

    return NextResponse.json({
      mentions: normalizedUsernames.filter((username) => mentionSet.has(username)),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Enter valid usernames." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to resolve mentions." },
      { status: 500 }
    );
  }
}
