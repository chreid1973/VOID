import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import FeedClient from "../../../components/FeedClient";
import { getCurrentUser } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { resolveStoredImageUrl } from "../../../r2";

const PAGE_SIZE = 20;

type FeedScope = "home" | "popular" | "all";
type FeedSort = "hot" | "new" | "top" | "rising";
type RankedPost = {
  id: string;
  score: number;
  commentCount: number;
  createdAt: Date;
};

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

function ageHours(createdAt: Date, nowMs: number) {
  return Math.max((nowMs - createdAt.getTime()) / 3_600_000, 0);
}

function hotScore(post: RankedPost, nowMs: number) {
  const hours = ageHours(post.createdAt, nowMs);
  const engagement =
    Math.max(post.score, 0) * 1.35 +
    post.commentCount * 2.3 +
    Math.min(post.score, 0) * 0.6 +
    2;

  return engagement / Math.pow(hours + 2, 1.32);
}

function risingScore(post: RankedPost, nowMs: number) {
  const hours = ageHours(post.createdAt, nowMs);
  const engagement =
    Math.max(post.score, 0) * 1.1 + post.commentCount * 2.8 + 1;
  const freshnessPenalty = hours > 72 ? 0.18 : 1;

  return (engagement * freshnessPenalty) / Math.pow(hours + 2, 1.9);
}

function compareRankedPosts(a: RankedPost, b: RankedPost, sort: FeedSort, nowMs: number) {
  const createdAtDelta = b.createdAt.getTime() - a.createdAt.getTime();
  const scoreDelta = b.score - a.score;
  const commentDelta = b.commentCount - a.commentCount;

  if (sort === "new") {
    return createdAtDelta || scoreDelta || commentDelta || a.id.localeCompare(b.id);
  }

  if (sort === "top") {
    return scoreDelta || commentDelta || createdAtDelta || a.id.localeCompare(b.id);
  }

  const rankDelta =
    sort === "rising"
      ? risingScore(b, nowMs) - risingScore(a, nowMs)
      : hotScore(b, nowMs) - hotScore(a, nowMs);

  if (Math.abs(rankDelta) > 0.000001) {
    return rankDelta;
  }

  return scoreDelta || commentDelta || createdAtDelta || a.id.localeCompare(b.id);
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
  const [{ userId }, user] = await Promise.all([auth(), getCurrentUser()]);

  if (userId && !user) {
    redirect("/onboarding");
  }

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

  const rankingNowMs = Date.now();
  const rankedPosts = await prisma.post.findMany({
    where,
    select: {
      id: true,
      score: true,
      commentCount: true,
      createdAt: true,
    },
  });

  rankedPosts.sort((a, b) => compareRankedPosts(a, b, initialSort, rankingNowMs));

  const pageOffset = (currentPage - 1) * PAGE_SIZE;
  const visiblePostIds = rankedPosts
    .slice(pageOffset, pageOffset + PAGE_SIZE)
    .map((post) => post.id);
  const hasNextPage = rankedPosts.length > pageOffset + PAGE_SIZE;
  const hasPreviousPage = currentPage > 1;
  const visiblePostsRaw =
    visiblePostIds.length > 0
      ? await prisma.post.findMany({
          where: {
            id: {
              in: visiblePostIds,
            },
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
                id: true,
                name: true,
                displayName: true,
                icon: true,
                color: true,
              },
            },
          },
        })
      : [];
  const visiblePostMap = new Map(
    visiblePostsRaw.map((post) => [post.id, post])
  );
  const visiblePosts = visiblePostIds
    .map((postId) => visiblePostMap.get(postId))
    .filter(
      (
        post
      ): post is (typeof visiblePostsRaw)[number] => Boolean(post)
    );

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
