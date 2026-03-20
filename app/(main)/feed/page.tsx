import { Prisma } from "@prisma/client";
import FeedClient from "../../../components/FeedClient";
import { getCurrentUser } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { resolveStoredImageUrl } from "../../../r2";

const PAGE_SIZE = 20;

type FeedScope = "home" | "popular" | "all";
type FeedSort = "hot" | "new" | "top" | "rising";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(months / 12);
  return `${years}y`;
}

function formatUserVote(value: number | null | undefined): 1 | -1 | null {
  return value === 1 ? 1 : value === -1 ? -1 : null;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseScope(value: string | undefined): FeedScope {
  return value === "popular" || value === "all" ? value : "home";
}

function parseSort(value: string | undefined): FeedSort {
  return value === "new" ||
    value === "top" ||
    value === "rising" ||
    value === "hot"
    ? value
    : "hot";
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildOrderBy(sort: FeedSort): Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case "new":
      return [{ createdAt: "desc" }];
    case "top":
      return [{ score: "desc" }, { commentCount: "desc" }, { createdAt: "desc" }];
    case "rising":
      return [{ createdAt: "desc" }, { commentCount: "desc" }, { score: "desc" }];
    case "hot":
    default:
      return [{ commentCount: "desc" }, { score: "desc" }, { createdAt: "desc" }];
  }
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: {
    community?: string | string[];
    scope?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    q?: string | string[];
  };
}) {
  const user = await getCurrentUser();
  const initialSelectedCommunity = firstParam(searchParams?.community)?.trim() || null;
  const initialScope = parseScope(firstParam(searchParams?.scope));
  const initialSort = parseSort(firstParam(searchParams?.sort));
  const currentPage = parsePage(firstParam(searchParams?.page));
  const initialQuery = firstParam(searchParams?.q)?.trim() || "";

  const [memberships, communities] = await Promise.all([
    user
      ? prisma.communityMember.findMany({
          where: { userId: user.id },
          select: {
            communityId: true,
          },
        })
      : Promise.resolve([]),
    prisma.community.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        icon: true,
        color: true,
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    }),
  ]);

  const joinedCommunityIds = memberships.map((membership) => membership.communityId);
  const joinedCommunityIdSet = new Set(joinedCommunityIds);
  const isPersonalizedHome =
    !initialSelectedCommunity &&
    initialScope === "home" &&
    joinedCommunityIds.length > 0;

  const whereClauses: Prisma.PostWhereInput[] = [];

  if (initialSelectedCommunity) {
    whereClauses.push({
      community: {
        name: {
          equals: initialSelectedCommunity,
          mode: "insensitive",
        },
      },
    });
  } else if (isPersonalizedHome) {
    whereClauses.push({
      communityId: {
        in: joinedCommunityIds,
      },
    });
  } else if (initialScope === "popular") {
    whereClauses.push({
      OR: [{ score: { gt: 0 } }, { commentCount: { gt: 0 } }],
    });
  }

  if (initialQuery) {
    whereClauses.push({
      OR: [
        {
          title: {
            contains: initialQuery,
            mode: "insensitive",
          },
        },
        {
          body: {
            contains: initialQuery,
            mode: "insensitive",
          },
        },
        {
          url: {
            contains: initialQuery,
            mode: "insensitive",
          },
        },
        {
          author: {
            username: {
              contains: initialQuery,
              mode: "insensitive",
            },
          },
        },
        {
          author: {
            displayName: {
              contains: initialQuery,
              mode: "insensitive",
            },
          },
        },
        {
          community: {
            displayName: {
              contains: initialQuery,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  const where =
    whereClauses.length > 0
      ? ({
          AND: whereClauses,
        } satisfies Prisma.PostWhereInput)
      : undefined;

  const posts = await prisma.post.findMany({
    where,
    orderBy: buildOrderBy(initialSort),
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          displayName: true,
          icon: true,
          color: true,
        },
      },
    },
  });

  const hasNextPage = posts.length > PAGE_SIZE;
  const visiblePosts = hasNextPage ? posts.slice(0, PAGE_SIZE) : posts;
  const hasPreviousPage = currentPage > 1;

  const postVotes =
    user && visiblePosts.length > 0
      ? await prisma.vote.findMany({
          where: {
            userId: user.id,
            postId: { in: visiblePosts.map((post) => post.id) },
          },
          select: {
            postId: true,
            value: true,
          },
        })
      : [];
  const postVoteMap = new Map(
    postVotes.map((vote) => [vote.postId as string, vote.value])
  );

  const formattedPosts = visiblePosts.map((post) => ({
    id: post.id,
    community: post.community.name,
    title: post.title,
    body: post.body ?? "",
    url: post.url,
    imageUrl: post.imageKey ? resolveStoredImageUrl(post.imageKey) : null,
    author: post.author.displayName || post.author.username,
    votes: post.score ?? 0,
    comments: post.commentCount ?? 0,
    time: timeAgo(post.createdAt),
    flair: post.flair,
    flairColor: post.flairColor,
    userVote: formatUserVote(postVoteMap.get(post.id)),
  }));

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: joinedCommunityIdSet.has(community.id),
  }));

  return (
    <FeedClient
      initialPosts={formattedPosts}
      communities={formattedCommunities}
      initialSelectedCommunity={initialSelectedCommunity}
      initialScope={initialScope}
      initialSort={initialSort}
      initialQuery={initialQuery}
      currentPage={currentPage}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      isPersonalizedHome={isPersonalizedHome}
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
