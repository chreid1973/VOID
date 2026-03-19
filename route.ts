// app/api/upload/route.ts
// Returns a presigned R2 URL. The browser uploads directly to R2.
// This avoids routing file bytes through Vercel (keeps functions fast + avoids 4.5MB limit).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { getUploadUrl } from "@/r2";
import { createId } from "@paralleldrive/cuid2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  contentType: z.string().refine(t => ALLOWED_TYPES.includes(t), {
    message: "Only JPEG, PNG, WebP, and GIF are allowed",
  }),
  size: z.number().max(MAX_SIZE_BYTES, "File must be under 5MB"),
  context: z.enum(["post", "avatar"]).default("post"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());

    const ext = body.contentType.split("/")[1];
    const key = `${body.context}s/${user.id}/${createId()}.${ext}`;

    const { uploadUrl } = await getUploadUrl(key, body.contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Upload setup failed" }, { status: 500 });
  }
}
