import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import {
  fetchLinkMetadata,
  getLinkFallbackTitle,
  normalizeExternalUrl,
} from "@/lib/linkPreview";

const schema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const { url } = schema.parse(await req.json());
    const normalizedUrl = normalizeExternalUrl(url);
    const metadata = await fetchLinkMetadata(normalizedUrl);

    return NextResponse.json({
      url: metadata.url,
      host: getLinkFallbackTitle(metadata.url),
      title: metadata.title,
      description: metadata.description,
      imageUrl: metadata.imageUrl,
      resolvedTitle: metadata.title || getLinkFallbackTitle(metadata.url),
      resolvedDescription: metadata.description,
      hasMetadata: Boolean(
        metadata.title || metadata.description || metadata.imageUrl
      ),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Enter a valid link URL." },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to preview link." },
      { status: 500 }
    );
  }
}
