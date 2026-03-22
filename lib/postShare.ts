import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { normalizePreviewImageUrl } from "./previewImages";
import { resolveStoredImageUrl } from "../r2";

export const SITE_URL = "https://socialvoid.ca";
export const SITE_NAME = "SocialVOID";

export type PostShareMetadataBase = {
  publicId: string;
  title: string;
  body: string | null;
  url: string | null;
  imageKey: string | null;
  createdAt: Date;
  community: {
    displayName: string;
  };
  author: {
    username: string;
    displayName: string | null;
  };
};

export function toAbsoluteSiteUrl(value: string) {
  return new URL(value, SITE_URL).toString();
}

export function cleanShareText(
  value: string | null | undefined,
  maxLength: number
) {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}...`
    : normalized;
}

export function buildPostShareDescription(post: {
  body: string | null;
  community: { displayName: string };
  author: { username: string; displayName: string | null };
  url: string | null;
}) {
  const snippet = cleanShareText(post.body, 180);

  if (snippet) {
    return snippet;
  }

  const authorName = post.author.displayName || post.author.username;

  if (post.url) {
    try {
      const hostname = new URL(post.url).hostname.replace(/^www\./i, "");
      return `Shared in ${post.community.displayName} by ${authorName} on ${SITE_NAME} from ${hostname}.`;
    } catch {}
  }

  return `A discussion in ${post.community.displayName} by ${authorName} on ${SITE_NAME}.`;
}

export function resolvePostShareImageUrl(imageRef: string | null | undefined) {
  const normalizedImageRef = normalizePreviewImageUrl(imageRef);
  if (!normalizedImageRef) return null;

  return toAbsoluteSiteUrl(resolveStoredImageUrl(normalizedImageRef));
}

export function buildFallbackPostShareImageUrl(publicId: string) {
  return toAbsoluteSiteUrl(`/p/${publicId}/opengraph-image`);
}

async function loadPostShareMetadataBase(id: string) {
  return prisma.post.findFirst({
    where: {
      OR: [{ publicId: id }, { id }],
      isHidden: false,
    },
    select: {
      publicId: true,
      title: true,
      body: true,
      url: true,
      imageKey: true,
      createdAt: true,
      community: {
        select: {
          displayName: true,
        },
      },
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });
}

export const loadCachedPostShareMetadataBase = unstable_cache(
  async (id: string) => loadPostShareMetadataBase(id),
  ["post-share-metadata"],
  {
    revalidate: 30,
    tags: ["post-page-content"],
  }
);
