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
    crosspostOfPostId,
  } = json as {
    title?: string;
    body?: string;
    communityId?: string;
    imageKey?: string;
    url?: string;
    includeLinkPreviewDescription?: boolean;
    includeLinkPreviewImage?: boolean;
    crosspostOfPostId?: string;
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
    return NextResponse.json(
      { error: "Finish setting up your profile before posting." },
      { status: 403 }
    );
  }

  const trimmedTitle = title?.trim() || "";
  const trimmedBody = body?.trim() || null;
  const trimmedCommunityId = communityId.trim();
  const trimmedImageKey = imageKey?.trim() || null;
  const trimmedUrl = url?.trim() || null;
  const trimmedCrosspostOfPostId = crosspostOfPostId?.trim() || null;
  const shouldIncludeLinkPreviewDescription =
    includeLinkPreviewDescription === true;
  const shouldIncludeLinkPreviewImage = includeLinkPreviewImage === true;

  if (
    trimmedCrosspostOfPostId &&
    (trimmedImageKey || trimmedUrl || trimmedTitle || trimmedBody)
  ) {
    return NextResponse.json(
      { error: "Crossposts reuse the original post content." },
      { status: 400 }
    );
  }

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
  let crosspostSource:
    | {
        id: string;
        title: string;
        body: string | null;
        url: string | null;
        imageKey: string | null;
        type: PostType;
        authorId: string;
        communityId: string;
        crosspostOfPostId: string | null;
      }
    | null = null;

  if (trimmedCrosspostOfPostId) {
    const sourcePost = await prisma.post.findUnique({
      where: { id: trimmedCrosspostOfPostId },
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        imageKey: true,
        type: true,
        authorId: true,
        communityId: true,
        crosspostOfPostId: true,
        isHidden: true,
      },
    });

    if (!sourcePost || sourcePost.isHidden) {
      return NextResponse.json(
        { error: "Original post not found." },
        { status: 404 }
      );
    }

    if (sourcePost.authorId !== user.id) {
      return NextResponse.json(
        { error: "Only the original author can crosspost right now." },
        { status: 403 }
      );
    }

    const canonicalSourceId = sourcePost.crosspostOfPostId ?? sourcePost.id;

    crosspostSource =
      canonicalSourceId === sourcePost.id
        ? sourcePost
        : await prisma.post.findUnique({
            where: { id: canonicalSourceId },
            select: {
              id: true,
              title: true,
              body: true,
              url: true,
              imageKey: true,
              type: true,
              authorId: true,
              communityId: true,
              crosspostOfPostId: true,
            },
          });

    if (!crosspostSource) {
      return NextResponse.json(
        { error: "Original post not found." },
        { status: 404 }
      );
    }

    if (crosspostSource.communityId === trimmedCommunityId) {
      return NextResponse.json(
        { error: "Pick a different community for the crosspost." },
        { status: 400 }
      );
    }
  }

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

  const finalTitle = crosspostSource
    ? crosspostSource.title
    : trimmedTitle ||
      scrapedTitle ||
      (normalizedUrl ? getLinkFallbackTitle(normalizedUrl) : "");
  const finalBody = crosspostSource
    ? crosspostSource.body
    : trimmedBody && shouldIncludeLinkPreviewDescription && scrapedDescription
      ? `${trimmedBody}\n\n${scrapedDescription}`
      : trimmedBody ||
        (shouldIncludeLinkPreviewDescription ? scrapedDescription : null);
  const storedImageKey = crosspostSource
    ? crosspostSource.imageKey
    : trimmedImageKey || (shouldIncludeLinkPreviewImage ? scrapedImageUrl : null);
  const finalUrl = crosspostSource ? crosspostSource.url : normalizedUrl;
  const finalType = crosspostSource
    ? crosspostSource.type
    : trimmedImageKey
      ? PostType.IMAGE
      : normalizedUrl
        ? PostType.LINK
        : PostType.TEXT;

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
        url: finalUrl,
        imageKey: storedImageKey,
        type: finalType,
        communityId: trimmedCommunityId,
        authorId: user.id,
        score: 1,
        crosspostOfPostId: crosspostSource?.id ?? null,
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
