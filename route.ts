// app/api/upload/route.ts
// Returns a presigned R2 URL. The browser uploads directly to R2.
// This avoids routing file bytes through Vercel (keeps functions fast + avoids 4.5MB limit).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { getUploadUrl } from "@/r2";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const REQUIRED_R2_ENV = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET_NAME",
  "NEXT_PUBLIC_R2_PUBLIC_URL",
] as const;

const schema = z.object({
  contentType: z.string().refine(t => ALLOWED_TYPES.includes(t), {
    message: "Only JPEG, PNG, WebP, and GIF are allowed",
  }),
  size: z.number().max(MAX_SIZE_BYTES, "File must be under 5MB"),
  context: z.enum(["post", "avatar"]).default("post"),
});

export async function POST(req: NextRequest) {
  try {
    const missingEnv = REQUIRED_R2_ENV.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
      console.error("[POST /api/upload] Missing R2 env:", missingEnv.join(", "));
      return NextResponse.json(
        { error: "Image uploads are not configured in this environment." },
        { status: 503 }
      );
    }

    const user = await requireUser();
    const body = schema.parse(await req.json());
    const ext = body.contentType.split("/")[1];
    const folder = body.context === "avatar" ? "avatars" : "posts";
    const key = `${folder}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await getUploadUrl(key, body.contentType, 60);

    return NextResponse.json({ uploadUrl, key, publicUrl });
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
