import { prisma } from "../../../../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { PostType } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  fetchLinkMetadata,
  getLinkFallbackTitle,
  normalizeExternalUrl,
} from "../../../../lib/linkPreview";
import { extractStoredR2Key } from "../../../../r2";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const {
    title,
    body,
    communityId,
    imageKey,
    url,
    includeLinkPreviewDescription,
    includeLinkPreviewImage,
  } = json as {
    title?: string;
    body?: string;
    communityId?: string;
    imageKey?: string;
    url?: string;
    includeLinkPreviewDescription?: boolean;
    includeLinkPreviewImage?: boolean;
  };

  if (!communityId?.trim()) {
    return NextResponse.json(
      { error: "Community is required." },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        username: `user_${userId.slice(0, 8)}`,
      },
    });
  }

  const trimmedTitle = title?.trim() || "";
  const trimmedBody = body?.trim() || null;
  const trimmedCommunityId = communityId.trim();
  const trimmedImageKey = imageKey?.trim() || null;
  const trimmedUrl = url?.trim() || null;
  const shouldIncludeLinkPreviewDescription =
    includeLinkPreviewDescription === true;
  const shouldIncludeLinkPreviewImage = includeLinkPreviewImage === true;

  if (trimmedImageKey && trimmedUrl) {
    return NextResponse.json(
      { error: "Choose either an image or a link for now." },
      { status: 400 }
    );
  }

  if (trimmedImageKey) {
    const hasAllowedExtension = /\.(?:jpe?g|png|webp|gif)$/i.test(
      trimmedImageKey
    );
    const storedKey = extractStoredR2Key(trimmedImageKey);

    if (!storedKey || !hasAllowedExtension) {
      return NextResponse.json(
        { error: "Invalid image upload." },
        { status: 400 }
      );
    }
  }

  let normalizedUrl: string | null = null;
  let scrapedTitle: string | null = null;
  let scrapedDescription: string | null = null;
  let scrapedImageUrl: string | null = null;

  if (trimmedUrl) {
    try {
      normalizedUrl = normalizeExternalUrl(trimmedUrl);
      const metadata = await fetchLinkMetadata(normalizedUrl);
      normalizedUrl = metadata.url;
      scrapedTitle = metadata.title;
      scrapedDescription = metadata.description;
      scrapedImageUrl = metadata.imageUrl;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid link URL.",
        },
        { status: 400 }
      );
    }
  }

  const finalTitle =
    trimmedTitle ||
    scrapedTitle ||
    (normalizedUrl ? getLinkFallbackTitle(normalizedUrl) : "");
  const finalBody =
    trimmedBody && shouldIncludeLinkPreviewDescription && scrapedDescription
      ? `${trimmedBody}\n\n${scrapedDescription}`
      : trimmedBody ||
        (shouldIncludeLinkPreviewDescription ? scrapedDescription : null);
  const storedImageKey =
    trimmedImageKey || (shouldIncludeLinkPreviewImage ? scrapedImageUrl : null);

  if (!finalTitle) {
    return NextResponse.json(
      { error: "Title is required unless a valid link can supply one." },
      { status: 400 }
    );
  }

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        title: finalTitle,
        body: finalBody,
        url: normalizedUrl,
        imageKey: storedImageKey,
        type: trimmedImageKey
          ? PostType.IMAGE
          : normalizedUrl
            ? PostType.LINK
            : PostType.TEXT,
        communityId: trimmedCommunityId,
        authorId: user.id,
        score: 1,
      },
    });

    await tx.vote.create({
      data: {
        userId: user.id,
        postId: createdPost.id,
        value: 1,
      },
    });

    return createdPost;
  });

  return NextResponse.json({ ok: true, postId: post.id });
}
