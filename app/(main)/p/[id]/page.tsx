import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { loadCommunityNavigationItems } from "../../../../lib/communityNav";
import { loadTrendingRailPosts } from "../../../../lib/trendingRail";
import PostPageShell from "../../../../components/PostPageShell";
import { resolveStoredImageUrl } from "../../../../r2";
import { filterMentionUsernames, loadExistingMentionUsernames } from "../../../../lib/mentions";
import { normalizePreviewImageUrl } from "../../../../lib/previewImages";

const SITE_URL = "https://socialvoid.ca";
const SITE_NAME = "SocialVOID";

function timeAgo(date: Date | string) {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatUserVote(value: number | null | undefined): 1 | -1 | null {
  return value === 1 ? 1 : value === -1 ? -1 : null;
}

function toIsoString(date: Date | string) {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveBackHref(
  communityName: string,
  fromValue?: string | string[]
) {
  const from = firstParam(fromValue)?.trim();

  if (from?.startsWith("/feed")) {
    return from;
  }

  return communityName
    ? `/feed?community=${encodeURIComponent(communityName)}`
    : "/feed";
}

function toAbsoluteSiteUrl(value: string) {
  return new URL(value, SITE_URL).toString();
}

function cleanShareText(value: string | null | undefined, maxLength: number) {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

function buildPostShareDescription(post: {
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

function resolvePostShareImageUrl(imageRef: string | null | undefined) {
  const normalizedImageRef = normalizePreviewImageUrl(imageRef);
  if (!normalizedImageRef) return null;

  return toAbsoluteSiteUrl(resolveStoredImageUrl(normalizedImageRef));
}

type LoadedComment = {
  id: string;
  parentId: string | null;
  body: string;
  mentions: string[];
  score: number;
  userVote: 1 | -1 | null;
  isHidden: boolean;
  isDeleted: boolean;
  isOwner: boolean;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  replies: LoadedComment[];
};

function buildCommentTree(
  flatComments: Array<Omit<LoadedComment, "replies">>
): LoadedComment[] {
  const map = new Map<string, LoadedComment>();
  const roots: LoadedComment[] = [];

  for (const comment of flatComments) {
    map.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of flatComments) {
    const node = map.get(comment.id);

    if (!node) continue;

    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)?.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function loadPostPageBase(id: string, includeHidden = false) {
  const post = await prisma.post.findFirst({
    where: includeHidden
      ? {
          OR: [{ publicId: id }, { id }],
        }
      : {
          OR: [{ publicId: id }, { id }],
          isHidden: false,
        },
    include: {
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
      community: {
        select: {
          name: true,
          displayName: true,
          color: true,
          icon: true,
        },
      },
      crosspostOf: {
        select: {
          id: true,
          publicId: true,
          author: {
            select: {
              username: true,
              displayName: true,
            },
          },
          community: {
            select: {
              name: true,
              displayName: true,
              color: true,
              icon: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const [comments, communities, railPosts] = await Promise.all([
    prisma.comment.findMany({
      where: {
        postId: post.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        author: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    }),
    loadCommunityNavigationItems(),
    loadTrendingRailPosts(5, post.id),
  ]);

  const validMentionUsernames = await loadExistingMentionUsernames([
    post.title,
    post.body,
    ...comments.map((comment) => comment.body),
  ]);

  return {
    post,
    comments,
    communities,
    railPosts,
    validMentionUsernames,
  };
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

const loadCachedPublicPostPageBase = unstable_cache(
  async (id: string) => loadPostPageBase(id, false),
  ["post-page-content"],
  {
    revalidate: 30,
    tags: ["post-page-content"],
  }
);

const loadCachedPostShareMetadataBase = unstable_cache(
  async (id: string) => loadPostShareMetadataBase(id),
  ["post-share-metadata"],
  {
    revalidate: 30,
    tags: ["post-page-content"],
  }
);

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const post = await loadCachedPostShareMetadataBase(params.id);

  if (!post) {
    return {
      title: `${SITE_NAME} - a better internet`,
      description: "The modern discussion platform",
    };
  }

  const canonicalUrl = toAbsoluteSiteUrl(`/p/${post.publicId}`);
  const description = buildPostShareDescription(post);
  const imageUrl = resolvePostShareImageUrl(post.imageKey);

  return {
    title: post.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: post.title,
      description,
      publishedTime: post.createdAt.toISOString(),
      authors: [post.author.displayName || post.author.username],
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { from?: string | string[] };
}) {
  const renderedAt = new Date().toISOString();
  const [user, cachedPostPageBase] = await Promise.all([
    getCurrentUser(),
    loadCachedPublicPostPageBase(params.id),
  ]);
  const isAdmin = isAdminUser(user);
  const postPageBase =
    cachedPostPageBase ?? (isAdmin ? await loadPostPageBase(params.id, true) : null);

  if (!postPageBase) return notFound();

  const { post, comments, communities, railPosts, validMentionUsernames } =
    postPageBase;

  if (post.isHidden && !isAdmin) return notFound();
  const backHref = resolveBackHref(post.community.name, searchParams?.from);
  if (params.id !== post.publicId) {
    permanentRedirect(`/p/${post.publicId}?from=${encodeURIComponent(backHref)}`);
  }
  const [postVote, commentVotes, savedPost, unreadNotificationCount] = user
    ? await Promise.all([
        prisma.vote.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: post.id,
            },
          },
          select: {
            value: true,
          },
        }),
        comments.length > 0
          ? prisma.vote.findMany({
              where: {
                userId: user.id,
                commentId: { in: comments.map((comment) => comment.id) },
              },
              select: {
                commentId: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: post.id,
            },
          },
          select: {
            id: true,
          },
        }),
        prisma.notification.count({
          where: {
            userId: user.id,
            readAt: null,
          },
        }),
      ])
    : [null, [], null, 0];
  const commentVoteMap = new Map(
    commentVotes.map((vote) => [vote.commentId as string, vote.value])
  );
  const validMentionSet = new Set(validMentionUsernames);

  const formattedPost = {
    id: post.id,
    publicId: post.publicId,
    title: post.title,
    body: post.body,
    bodyHtml: post.bodyHtml,
    url: post.url,
    imageUrl: post.imageKey ? resolveStoredImageUrl(post.imageKey) : null,
    mentions: filterMentionUsernames(
      [post.title, post.body].filter(Boolean).join("\n"),
      validMentionSet
    ),
    createdAt: toIsoString(post.createdAt),
    score: post.score,
    userVote: formatUserVote(postVote?.value),
    isSaved: Boolean(savedPost),
    isOwner: user?.id === post.authorId,
    commentCount: post.commentCount,
    author: {
      username: post.author.username,
      displayName: post.author.displayName,
    },
    community: {
      name: post.community.name,
      displayName: post.community.displayName,
      color: post.community.color,
      icon: post.community.icon,
    },
    crosspostSource: post.crosspostOf
      ? {
          id: post.crosspostOf.id,
          publicId: post.crosspostOf.publicId,
          authorName:
            post.crosspostOf.author.displayName || post.crosspostOf.author.username,
          authorUsername: post.crosspostOf.author.username,
          community: post.crosspostOf.community.name,
          communityDisplayName: post.crosspostOf.community.displayName,
          communityColor: post.crosspostOf.community.color,
          communityIcon: post.crosspostOf.community.icon,
        }
      : null,
    comments: buildCommentTree(
      comments.map((comment) => ({
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        mentions: filterMentionUsernames(comment.body, validMentionSet),
        score: comment.score,
        userVote: formatUserVote(commentVoteMap.get(comment.id)),
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        isOwner: user?.id === comment.authorId,
        createdAt: toIsoString(comment.createdAt),
        author: {
          username: comment.author.username,
          displayName: comment.author.displayName,
        },
      }))
    ),
  };

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community.memberCount,
    postCount: community.postCount,
    isMember: false,
  }));

  const formattedRailPosts = railPosts.map((item) => ({
    id: item.id,
    publicId: item.publicId,
    title: item.title,
    votes: item.votes,
    community: item.community,
    communityDisplayName: item.communityDisplayName,
    communityColor: item.communityColor,
    communityIcon: item.communityIcon,
    time: timeAgo(item.createdAt),
  }));

  return (
    <PostPageShell
      post={formattedPost}
      communities={formattedCommunities}
      railPosts={formattedRailPosts}
      backHref={backHref}
      renderedAt={renderedAt}
      notificationUnreadCount={unreadNotificationCount}
      currentUser={
        user
          ? {
              username: user.username,
              displayName: user.displayName,
            }
          : null
      }
    />
  );
}
