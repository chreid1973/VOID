import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import FeedClient from "../../../components/FeedClient";
import { getCurrentUser } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { compareRankedPosts, type FeedSort } from "../../../lib/postRanking";
import { resolveStoredImageUrl } from "../../../r2";
import { loadTrendingRailPosts } from "../../../lib/trendingRail";
import { filterMentionUsernames, loadExistingMentionUsernames } from "../../../lib/mentions";

const PAGE_SIZE = 20;
const RANKING_CANDIDATE_LIMIT = 250;

type FeedScope = "home" | "following" | "popular" | "all";

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
  return value === "popular" || value === "all" || value === "following"
    ? value
    : "home";
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

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: {
    community?: string | string[];
    scope?: string | string[];
    sort?: string | string[];
    page?: string | string[];
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

  const [memberships, follows, communities, trendingRailPosts, unreadNotificationCount] = await Promise.all([
    user
      ? prisma.communityMember.findMany({
          where: { userId: user.id },
          select: {
            communityId: true,
          },
        })
      : Promise.resolve([]),
    user
      ? prisma.userFollow.findMany({
          where: { followerId: user.id },
          select: {
            followingId: true,
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
    loadTrendingRailPosts(5),
    user
      ? prisma.notification.count({
          where: {
            userId: user.id,
            readAt: null,
          },
        })
      : Promise.resolve(0),
  ]);

  const joinedCommunityIds = memberships.map((membership) => membership.communityId);
  const joinedCommunityIdSet = new Set(joinedCommunityIds);
  const followedAuthorIds = follows.map((follow) => follow.followingId);
  const isPersonalizedHome =
    !initialSelectedCommunity &&
    initialScope === "home" &&
    joinedCommunityIds.length > 0;

  const whereClauses: Prisma.PostWhereInput[] = [];

  whereClauses.push({
    isHidden: false,
  });

  if (initialSelectedCommunity) {
    whereClauses.push({
      community: {
        name: {
          equals: initialSelectedCommunity,
          mode: "insensitive",
        },
      },
    });
  } else if (initialScope === "following") {
    whereClauses.push({
      authorId: {
        in: followedAuthorIds,
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

  const where =
    whereClauses.length > 0
      ? ({
          AND: whereClauses,
        } satisfies Prisma.PostWhereInput)
      : undefined;

  const pageOffset = (currentPage - 1) * PAGE_SIZE;
  const hasPreviousPage = currentPage > 1;
  const postInclude = {
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
  } satisfies Prisma.PostInclude;

  let visiblePosts: Array<
    Prisma.PostGetPayload<{
      include: typeof postInclude;
    }>
  > = [];
  let hasNextPage = false;

  if (initialSort === "new" || initialSort === "top") {
    const orderedPosts = await prisma.post.findMany({
      where,
      orderBy:
        initialSort === "new"
          ? [{ createdAt: "desc" }, { score: "desc" }]
          : [{ score: "desc" }, { createdAt: "desc" }],
      skip: pageOffset,
      take: PAGE_SIZE + 1,
      include: postInclude,
    });

    hasNextPage = orderedPosts.length > PAGE_SIZE;
    visiblePosts = orderedPosts.slice(0, PAGE_SIZE);
  } else {
    const rankingNowMs = Date.now();
    const rankedPostsRaw = await prisma.post.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: RANKING_CANDIDATE_LIMIT,
      select: {
        id: true,
        score: true,
        createdAt: true,
      },
    });

    const rankedPostIds = rankedPostsRaw.map((post) => post.id);
    const [topLevelCommentCounts, replyCounts] =
      rankedPostIds.length > 0
        ? await Promise.all([
            prisma.comment.groupBy({
              by: ["postId"],
              where: {
                postId: {
                  in: rankedPostIds,
                },
                isDeleted: false,
                isHidden: false,
                parentId: null,
              },
              _count: {
                _all: true,
              },
            }),
            prisma.comment.groupBy({
              by: ["postId"],
              where: {
                postId: {
                  in: rankedPostIds,
                },
                isDeleted: false,
                isHidden: false,
                parentId: {
                  not: null,
                },
              },
              _count: {
                _all: true,
              },
            }),
          ])
        : [[], []];

    const topLevelCommentCountMap = new Map(
      topLevelCommentCounts.map((entry) => [entry.postId, entry._count._all])
    );
    const replyCountMap = new Map(
      replyCounts.map((entry) => [entry.postId, entry._count._all])
    );
    const rankedPosts = rankedPostsRaw.map((post) => ({
      id: post.id,
      score: post.score,
      commentCount: topLevelCommentCountMap.get(post.id) ?? 0,
      replyCount: replyCountMap.get(post.id) ?? 0,
      createdAt: post.createdAt,
    }));

    rankedPosts.sort((a, b) => compareRankedPosts(a, b, initialSort, rankingNowMs));

    const visiblePostIds = rankedPosts
      .slice(pageOffset, pageOffset + PAGE_SIZE)
      .map((post) => post.id);
    hasNextPage = rankedPosts.length > pageOffset + PAGE_SIZE;

    const visiblePostsRaw =
      visiblePostIds.length > 0
        ? await prisma.post.findMany({
            where: {
              id: {
                in: visiblePostIds,
              },
            },
            include: postInclude,
          })
        : [];
    const visiblePostMap = new Map(
      visiblePostsRaw.map((post) => [post.id, post])
    );

    visiblePosts = visiblePostIds
      .map((postId) => visiblePostMap.get(postId))
      .filter(
        (
          post
        ): post is (typeof visiblePostsRaw)[number] => Boolean(post)
      );
  }

  const [postVotes, savedPosts] =
    user && visiblePosts.length > 0
      ? await Promise.all([
          prisma.vote.findMany({
            where: {
              userId: user.id,
              postId: { in: visiblePosts.map((post) => post.id) },
            },
            select: {
              postId: true,
              value: true,
            },
          }),
          prisma.savedPost.findMany({
            where: {
              userId: user.id,
              postId: { in: visiblePosts.map((post) => post.id) },
            },
            select: {
              postId: true,
            },
          }),
        ])
      : [[], []];
  const postVoteMap = new Map(
    postVotes.map((vote) => [vote.postId as string, vote.value])
  );
  const savedPostIdSet = new Set(savedPosts.map((savedPost) => savedPost.postId));
  const validMentionUsernames = await loadExistingMentionUsernames(
    visiblePosts.flatMap((post) => [post.title, post.body])
  );
  const validMentionSet = new Set(validMentionUsernames);

  const formattedPosts = visiblePosts.map((post) => ({
    id: post.id,
    publicId: post.publicId,
    community: post.community.name,
    title: post.title,
    body: post.body ?? "",
    url: post.url,
    imageUrl: post.imageKey ? resolveStoredImageUrl(post.imageKey) : null,
    authorName: post.author.displayName || post.author.username,
    authorUsername: post.author.username,
    votes: post.score ?? 0,
    comments: post.commentCount ?? 0,
    mentions: filterMentionUsernames(
      [post.title, post.body].filter(Boolean).join("\n"),
      validMentionSet
    ),
    time: timeAgo(post.createdAt),
    flair: post.flair,
    flairColor: post.flairColor,
    userVote: formatUserVote(postVoteMap.get(post.id)),
    isSaved: savedPostIdSet.has(post.id),
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
  }));
  const formattedRailPosts = trendingRailPosts.map((post) => ({
    id: post.id,
    publicId: post.publicId,
    title: post.title,
    votes: post.votes,
    community: post.community,
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
      currentPage={currentPage}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      isPersonalizedHome={isPersonalizedHome}
      followedAuthorCount={followedAuthorIds.length}
      railPosts={formattedRailPosts}
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
